import { Channel } from "amqplib";

export interface RabbitQueueConnection {
    createChannel(): Promise<Channel>;
}