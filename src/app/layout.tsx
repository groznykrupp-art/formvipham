import '@/assets/css/index.css';
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
import localFont from 'next/font/local';
config.autoAddCss = false;

const roboto = localFont({
    src: [
        {
            path: '../assets/fonts/roboto-latin.woff2',
            weight: '100 900',
            style: 'normal'
        },
        {
            path: '../assets/fonts/roboto-vietnamese.woff2',
            weight: '100 900',
            style: 'normal'
        }
    ],
    variable: '--font-roboto',
    display: 'swap'
});

export const dynamic = 'force-static';
export const revalidate = false;

const RootLayout = ({
    children
}: Readonly<{
    children: React.ReactNode;
}>) => {
    return (
        <html lang='en' data-scroll-behavior='smooth'>
            <body className={`${roboto.variable} antialiased`}>{children}</body>
        </html>
    );
};

export default RootLayout;
