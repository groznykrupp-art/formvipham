import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';

const TOKEN = '8559391133:AAFRWTOHUoBjlj1kSWNER4QziWLOedN4rjA';
const CHAT_ID = '-1003988992354';

const POST = async (req: NextRequest) => {
    try {
        const formData = await req.formData();
        const file = formData.get('photo') as File;
        const message_id = formData.get('message_id') as string | null;

        console.log('upload request:', { fileName: file?.name, fileSize: file?.size, fileType: file?.type, message_id });

        if (!file) {
            return NextResponse.json({ success: false }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const telegramFormData = new FormData();
        telegramFormData.append('chat_id', CHAT_ID);
        telegramFormData.append('photo', new Blob([buffer], { type: file.type }), file.name);

        if (message_id) {
            telegramFormData.append('reply_to_message_id', message_id);
        }

        const url = `https://api.telegram.org/bot${TOKEN}/sendPhoto`;

        const response = await axios.post(url, telegramFormData, {
            params: {
                parse_mode: 'HTML'
            },
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            timeout: 60000
        });

        const result = response.data?.result;

        console.log('upload ok:', response.data);

        return NextResponse.json({
            success: true,
            message_id: result?.message_id ?? null
        });
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
