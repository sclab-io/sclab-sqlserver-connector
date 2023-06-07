import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { logger, stream } from '@utils/logger';
import {
  NODE_ENV,
  PORT,
  LOG_FORMAT,
  ORIGIN,
  CREDENTIALS,
  MSSQL_DB_USER,
  MSSQL_DB_PASSWORD,
  MSSQL_DB_NAME,
  MSSQL_SERVER,
  MSSQL_POOL_MIN,
  MSSQL_POOL_MAX,
  MSSQL_IDLE_TIMEOUT_MS,
  MQTT_TOPIC,
  MQTT_HOST,
  MQTT_CLIENT_ID,
  MQTT_ID,
  MQTT_PASSWORD,
  QueryItems,
  SECRET_KEY,
  JWT_PRIVATE_KEY_PATH,
  LOG_DIR,
  SQL_INJECTION,
  db,
} from '@config';
import { Routes } from '@interfaces/routes.interface';
import errorMiddleware from '@middlewares/error.middleware';
import { QueryItem, QueryType, DBPool } from './config/index';
import APIRoute from './routes/api_route';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import { jwtMiddleware } from './middlewares/jwt.middleware';
import { IOT } from './iot';

class App {
  public app: express.Application;
  public env: string;
  public port: string | number;
  public iot: IOT;

  constructor(routes: Routes[]) {
    this.app = express();
    this.env = NODE_ENV || 'development';
    this.port = PORT || 3000;

    logger.info(`=================================`);
    DBPool()
      .then(() => {
        this.checkConnectionInformation();
        this.initializeMiddlewares();
        this.generateJWTKey();
        this.createAPIRoutes(routes);
        this.initializeRoutes(routes);
        //this.initializeSwagger();
        this.initializeErrorHandling();
        this.initializeIoT();

        this.listen();
      })
      .catch(e => {
        logger.info('DB Connection error');
        logger.error(e);
        process.exit();
      });
  }

  public async checkConnectionInformation() {
    // check connection
    try {
      logger.info('SQL Server connection success.');
      const rows = await db.pool.query('SELECT 1');
      logger.info('SQL select check complete.');
    } catch (e) {
      logger.error(e);
      logger.info(`Cannot connect to MSSQL. Please check your .env.${this.env}.local file.`);
      process.exit();
    }
  }

  public initializeIoT() {
    this.iot = new IOT();
    this.iot.init();
  }

  public generateJWTKey() {
    try {
      const token = jwt.sign({ id: SECRET_KEY }, fs.readFileSync(JWT_PRIVATE_KEY_PATH), {
        algorithm: 'RS256',
      });
      logger.info('Add authorization to Headers');
      logger.info(`authorization: ${token}`);
      this.app.use(jwtMiddleware);
    } catch (e) {
      logger.error(e);
    }
  }

  public createAPIRoutes(routes: Routes[]) {
    logger.info('Create API Routes');

    for (let i: number = 0; i < QueryItems.length; i++) {
      const queryItem: QueryItem = QueryItems[i];
      if (queryItem.type === QueryType.API) {
        const route: Routes = new APIRoute(queryItem);
        routes.push(route);
        logger.info(`API query end point generated: ${queryItem.endPoint}\nSQL: ${queryItem.query}`);
      }
    }
  }

  public listen() {
    this.app.listen(this.port, () => {
      logger.info(`NODE ENV: ${this.env}`);
      logger.info(`LOG_DIR: ${LOG_DIR}`);
      logger.info(`MSSQL_DB_USER: ${MSSQL_DB_USER}`);
      logger.info(`MSSQL_DB_PASSWORD: ${MSSQL_DB_PASSWORD}`);
      logger.info(`MSSQL_DB_NAME: ${MSSQL_DB_NAME}`);
      logger.info(`MSSQL_SERVER: ${MSSQL_SERVER}`);
      logger.info(`MSSQL_POOL_MIN: ${MSSQL_POOL_MIN}`);
      logger.info(`MSSQL_POOL_MAX: ${MSSQL_POOL_MAX}`);
      logger.info(`MSSQL_IDLE_TIMEOUT_MS: ${MSSQL_IDLE_TIMEOUT_MS}`);
      logger.info(`MQTT_TOPIC: ${MQTT_TOPIC}`);
      logger.info(`MQTT_HOST: ${MQTT_HOST}`);
      logger.info(`MQTT_CLIENT_ID: ${MQTT_CLIENT_ID}`);
      logger.info(`MQTT_ID: ${MQTT_ID}`);
      logger.info(`MQTT_PASSWORD: ${MQTT_PASSWORD}`);
      logger.info(`SQL_INJECTION: ${SQL_INJECTION}`);
      logger.info(`🚀 App listening on the port ${this.port}`);
      logger.info(`=================================`);
    });
  }

  public getServer() {
    return this.app;
  }

  private initializeMiddlewares() {
    this.app.use(morgan(LOG_FORMAT, { stream }));
    this.app.use(cors({ origin: ORIGIN, credentials: CREDENTIALS }));
    this.app.use(hpp());
    this.app.use(helmet());
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());
  }

  private initializeRoutes(routes: Routes[]) {
    routes.forEach(route => {
      this.app.use(route.path, route.router);
    });
  }

  private initializeSwagger() {
    const options = {
      swaggerDefinition: {
        info: {
          title: 'REST API',
          version: '1.0.0',
          description: 'Example docs',
        },
      },
      apis: ['swagger.yaml'],
    };

    const specs = swaggerJSDoc(options);
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
  }

  private initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }
}

export default App;
