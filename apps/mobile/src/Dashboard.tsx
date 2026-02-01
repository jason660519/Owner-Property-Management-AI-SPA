import React, { useState } from 'react';
import { View, Platform, TouchableOpacity, Text } from 'react-native';
import Sidebar from './components/Sidebar';
import LandlordDashboard from './screens/dashboard/LandlordDashboard';
import SuperAdminDashboard from './screens/dashboard/SuperAdminDashboard';
import DocumentsScreen from './screens/dashboard/DocumentsScreen';
import { FontAwesome5 } from '@expo/vector-icons';
import { cssInterop } from "nativewind";
import { useAuth } from './hooks/useAuth';

// Hardcoded matching colors from tailwind.config.js
const ICON_COLORS = {
    white: '#ffffff',
    grey60: '#999999',
    purple60: '#703BF7',
};

type UserRole = 'landlord' | 'super_admin';
type Tab = 'home' | 'documents' | 'profile';

export default function Dashboard() {
    const [currentRole, setCurrentRole] = useState<UserRole>('landlord');
    const [activeTab, setActiveTab] = useState<Tab>('home');
    const { user, signOut } = useAuth();
    const isWeb = Platform.OS === 'web';

    // Helper to toggle role (For Dev/Demo purposes)
    const toggleRole = () => {
        setCurrentRole(prev => prev === 'landlord' ? 'super_admin' : 'landlord');
    };

    const handleLogout = async () => {
        await signOut();
    };

    const renderContent = () => {
        // If web, sidebar handles navigation (not implemented fully here for web switching, defaulting to Dashboard)
        // For mobile, we switch based on activeTab
        if (!isWeb) {
            switch (activeTab) {
                case 'home':
                    return currentRole === 'landlord' ? <LandlordDashboard /> : <SuperAdminDashboard />;
                case 'documents':
                    return <DocumentsScreen />;
                case 'profile':
                    return (
                        <View className="flex-1 justify-center items-center p-6">
                            <FontAwesome5 name="user-circle" size={64} color={ICON_COLORS.grey60} />
                            <Text className="text-text-primary mt-4 text-xl font-semibold">
                                {user?.email || 'User Profile'}
                            </Text>
                            <Text className="text-text-secondary mt-2 text-sm">
                                Role: {currentRole}
                            </Text>
                            <TouchableOpacity
                                onPress={handleLogout}
                                className="bg-red-500 mt-8 py-3 px-8 rounded-lg"
                            >
                                <Text className="text-white font-semibold">登出</Text>
                            </TouchableOpacity>
                        </View>
                    );
                default:
                    return <LandlordDashboard />;
            }
        }

        // Web View
        return currentRole === 'landlord' ? <LandlordDashboard /> : <SuperAdminDashboard />;
    };

    return (
        <View className={`flex-1 h-full bg-bg-secondary ${isWeb ? 'flex-row' : 'flex-col'}`}>
            {/* Sidebar - Visible on Desktop/Web, hidden on mobile */}
            <View className={`${isWeb ? 'flex w-60 z-10' : 'hidden'}`}>
                <Sidebar />
            </View>

            {/* Main Content Area */}
            <View className="flex-1 relative">
                {renderContent()}

                {/* --- Dev Only: Role Toggle Button (Web Only or hidden) --- */}
                {isWeb && (
                    <View className="absolute bottom-5 right-5 z-50">
                        <TouchableOpacity
                            onPress={toggleRole}
                            className="bg-accent flex-row items-center gap-2 py-2 px-4 rounded-xl shadow-lg"
                        >
                            <FontAwesome5 name="user-cog" size={14} color={ICON_COLORS.white} />
                            <Text className="text-text-primary text-xs font-bold">
                                Switch to {currentRole === 'landlord' ? 'Super Admin' : 'Landlord'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Mobile Bottom Tab Bar */}
            {!isWeb && (
                <View className="flex-row bg-bg-secondary border-t border-border-light pb-5 pt-2.5 h-20">
                    <TouchableOpacity
                        className="flex-1 items-center justify-center gap-1"
                        onPress={() => setActiveTab('home')}
                    >
                        <FontAwesome5
                            name="home"
                            size={20}
                            color={activeTab === 'home' ? ICON_COLORS.purple60 : ICON_COLORS.grey60}
                        />
                        <Text className={`text-[10px] ${activeTab === 'home' ? 'text-accent font-bold' : 'text-text-muted'}`}>
                            Home
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="flex-1 items-center justify-center gap-1"
                        onPress={() => setActiveTab('documents')}
                    >
                        <FontAwesome5
                            name="file-alt"
                            size={20}
                            color={activeTab === 'documents' ? ICON_COLORS.purple60 : ICON_COLORS.grey60}
                        />
                        <Text className={`text-[10px] ${activeTab === 'documents' ? 'text-accent font-bold' : 'text-text-muted'}`}>
                            Docs
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="flex-1 items-center justify-center gap-1"
                        onPress={() => setActiveTab('profile')}
                    >
                        <FontAwesome5
                            name="user"
                            size={20}
                            color={activeTab === 'profile' ? ICON_COLORS.purple60 : ICON_COLORS.grey60}
                        />
                        <Text className={`text-[10px] ${activeTab === 'profile' ? 'text-accent font-bold' : 'text-text-muted'}`}>
                            Profile
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}
