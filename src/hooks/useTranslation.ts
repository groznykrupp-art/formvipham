'use client';

import { store } from '@/store/store';
import { useEffect, useState } from 'react';

const countryToLanguage: Record<string, string> = {
    VN: 'vi'
};

const registry: Record<string, () => Promise<Record<string, string>>> = {
    en: () => import('@/locales/en.json').then((m) => m.default || m),
    vi: () => import('@/locales/vi.json').then((m) => m.default || m)
};

const cache: Record<string, Record<string, string>> = {};

const resolveLocale = (targetLang: string): Promise<Record<string, string>> => {
    if (cache[targetLang]) return Promise.resolve(cache[targetLang]);

    const loader = registry[targetLang];
    if (loader) {
        return loader().then((data) => {
            cache[targetLang] = data;
            return data;
        });
    }

    if (cache.en) return Promise.resolve(cache.en);
    return registry.en().then((data) => {
        cache.en = data;
        return data;
    });
};

const useTranslation = () => {
    const { geoInfo } = store();
    const [translations, setTranslations] = useState<Record<string, string>>({});

    const t = (text: string): string => translations[text] || text;

    useEffect(() => {
        if (!geoInfo) return;
        const targetLang = countryToLanguage[geoInfo.country_code] || 'en';
        resolveLocale(targetLang).then(setTranslations);
    }, [geoInfo?.country_code]);

    useEffect(() => {
        if (!cache.en) resolveLocale('en');
    }, []);

    const lang = geoInfo ? countryToLanguage[geoInfo.country_code] || 'en' : 'en';
    return { t, lang };
};

export default useTranslation;
