const LINE_MESSAGING_API_URL = 'https://api.line.me/v2/bot/message/push';

interface LineMessage {
    type: 'text';
    text: string;
}

export async function sendLineMessage(userId: string, messages: LineMessage[]) {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) {
        console.warn('LINE_CHANNEL_ACCESS_TOKEN is not set. Skipping message sending.');
        return;
    }

    try {
        const response = await fetch(LINE_MESSAGING_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                to: userId,
                messages: messages,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Failed to send LINE message:', error);
            throw new Error(`LINE API Error: ${JSON.stringify(error)}`);
        }

        console.log(`LINE message sent to ${userId}`);
    } catch (error) {
        console.error('Error sending LINE message:', error);
        // We don't throw here to avoid failing the booking if notification fails
    }
}
