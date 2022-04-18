import { Channel } from "amqplib";
import { RabbitQueueConnection } from "../interfaces/RabbitQueueConnection";
import * as amqp from 'amqplib';

export class QueueConnection implements RabbitQueueConnection {
    readonly queueName: string;

    constructor() {
        //TODO: queueName to env?
        this.queueName = 'converter';
    }

    async createChannel(): Promise<Channel> {
        const amqpUrl = process.env.AMQP_URL;
        if (amqpUrl == undefined) {
            //TODO: add logger
            process.exit(1);
        }

        const connection = await amqp.connect(amqpUrl);
        const channel = await connection.createChannel();
        await channel.assertQueue(this.queueName);

        return channel;
    }

}