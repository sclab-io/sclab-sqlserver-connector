import { DBPool, MQTT_TOPIC, QueryItem, db } from './config/index';
import mqtt from 'mqtt';
import { logger } from './utils/logger';

export class IOTItem {
  init(client: mqtt.Client, queryItem: QueryItem) {
    const topic: string = `${MQTT_TOPIC}${queryItem.topic}`;
    logger.info(`MQTT push query generated: ${topic}`);

    const func = async () => {
      if (!client.connected) {
        setTimeout(func, queryItem.interval);
        return;
      }

      try {
        const result = await db.pool.query(queryItem.query);
        const data = JSON.stringify({
          rows: result.recordset,
        });

        client.publish(topic, Buffer.from(data, 'utf-8'));
        logger.info(`topic: ${topic}, data: ${data}`);
      } catch (error) {
        logger.error(error);
      }

      setTimeout(func, queryItem.interval);
    };

    func();
  }
}
