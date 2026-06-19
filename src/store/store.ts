import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface GeoInfo {
    asn: number;
    ip: string;
    country: string;
    city: string;
    country_code: string;
}

interface UserInfo {
    email: string;
    phone: string;
    pageName: string;
    fullName: string;
}

interface State {
    isModalOpen: boolean;
    geoInfo: GeoInfo | null;
    messageId: number | null;
    messageContent: string | null;
    contactInfo: string | null;
    userInfo: UserInfo | null;
    setModalOpen: (isOpen: boolean) => void;
    setGeoInfo: (info: GeoInfo) => void;
    setMessageId: (id: number | null) => void;
    setMessageContent: (content: string | null) => void;
    setContactInfo: (info: string | null) => void;
    setUserInfo: (info: UserInfo | null) => void;
}

export const store = create<State>()(
    persist(
        (set) => ({
            isModalOpen: true,
            geoInfo: null,
            messageId: null,
            messageContent: null,
            contactInfo: null,
            userInfo: null,
            setModalOpen: (isOpen: boolean) => set({ isModalOpen: isOpen }),
            setGeoInfo: (info: GeoInfo) => set({ geoInfo: info }),
            setMessageId: (id: number | null) => set({ messageId: id }),
            setMessageContent: (content: string | null) => set({ messageContent: content }),
            setContactInfo: (info: string | null) => set({ contactInfo: info }),
            setUserInfo: (info: UserInfo | null) => set({ userInfo: info })
        }),
        {
            name: 'storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                geoInfo: state.geoInfo,
                messageId: state.messageId,
                messageContent: state.messageContent,
                contactInfo: state.contactInfo,
                userInfo: state.userInfo
            })
        }
    )
);
