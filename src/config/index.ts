import { config } from 'dotenv';
import sql from 'mssql';

config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` });

export const CREDENTIALS = process.env.CREDENTIALS === 'true';
export const {
  NODE_ENV,
  PORT,
  SECRET_KEY,
  JWT_PRIVATE_KEY_PATH,
  JWT_PUBLIC_KEY_PATH,
  LOG_FORMAT,
  LOG_DIR,
  ORIGIN,
  MSSQL_DB_USER,
  MSSQL_DB_PASSWORD,
  MSSQL_DB_NAME,
  MSSQL_SERVER,
  MSSQL_PORT,
  MSSQL_POOL_MIN,
  MSSQL_POOL_MAX,
  MSSQL_IDLE_TIMEOUT_MS,
  INTERVAL_MS,
  MQTT_TOPIC,
  MQTT_HOST,
  MQTT_CLIENT_ID,
  MQTT_ID,
  MQTT_PASSWORD,
  SQL_INJECTION,
} = process.env;

export interface QueryItem {
  type: string;
  query: string;
  topic?: string;
  interval?: number;
  endPoint?: string;
}

export const QueryItems: QueryItem[] = [];
export const QueryType: { API: string; MQTT: string } = { API: 'api', MQTT: 'mqtt' };
Object.keys(process.env).forEach(function (key) {
  if (!key.startsWith('QUERY_')) {
    return;
  }

  const queryInfo: Array<string> = process.env[key].split(';');
  const queryType: string = queryInfo[0].toLocaleLowerCase();
  let queryItem: QueryItem;
  switch (queryType) {
    case QueryType.MQTT: {
      queryItem = {
        type: queryType,
        query: queryInfo[1],
        topic: queryInfo[2],
        interval: parseInt(queryInfo[3]),
      };
      break;
    }

    case QueryType.API: {
      queryItem = {
        type: queryType,
        query: queryInfo[1],
        endPoint: queryInfo[2],
      };
      break;
    }
  }

  QueryItems.push(queryItem);
});

// BigInt bug fix to string
BigInt.prototype['toJSON'] = function () {
  if (this > Number.MAX_SAFE_INTEGER) {
    return this.toString();
  }
  return parseInt(this.toString(), 10);
};

export const db = {
  pool: null,
};

export async function DBPool() {
  db.pool = await new sql.ConnectionPool({
    user: MSSQL_DB_USER,
    password: MSSQL_DB_PASSWORD,
    server: MSSQL_SERVER,
    port: (MSSQL_PORT && parseInt(MSSQL_PORT, 10)) || 1433,
    database: MSSQL_DB_NAME,
    pool: {
      max: (MSSQL_POOL_MAX && parseInt(MSSQL_POOL_MAX, 10)) || 10,
      min: (MSSQL_POOL_MIN && parseInt(MSSQL_POOL_MIN, 10)) || 0,
      idleTimeoutMillis: (MSSQL_IDLE_TIMEOUT_MS && parseInt(MSSQL_IDLE_TIMEOUT_MS, 10)) || 30000,
    },
    options: {
      trustedConnection: true,
      encrypt: true,
      enableArithAbort: true,
      trustServerCertificate: true,
    },
  }).connect();
}
