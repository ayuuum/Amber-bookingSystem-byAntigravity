import { messagingApi } from '@line/bot-sdk';

const { MessagingApiClient } = messagingApi;

const client = new MessagingApiClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
});

export const lineClient = client;
