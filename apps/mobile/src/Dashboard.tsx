import React, { useState } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Text } from 'react-native';
import Sidebar from './components/Sidebar';
import LandlordDashboard from './screens/dashboard/LandlordDashboard';
import SuperAdminDashboard from './screens/dashboard/SuperAdminDashboard';
import { FontAwesome5 } from '@expo/vector-icons';

type UserRole = 'landlord' | 'super_admin';

export default function Dashboard() {
    const [currentRole, setCurrentRole] = useState<UserRole>('landlord');

    // Helper to toggle role (For Dev/Demo purposes)
    const toggleRole = () => {
        setCurrentRole(prev => prev === 'landlord' ? 'super_admin' : 'landlord');
    };

    return (
        <View style={styles.container}>
            {/* Sidebar - Visible on Desktop/Web, hidden on mobile (for now) */}
            <View style={styles.sidebarWrapper}>
                <Sidebar />
            </View>

            {/* Main Content Area */}
            <View style={styles.mainContent}>

                {/* Render Dashboard based on Role */}
                {currentRole === 'landlord' ? (
                    <LandlordDashboard />
                ) : (
                    <SuperAdminDashboard />
                )}

                {/* --- Dev Only: Role Toggle Button --- */}
                <View style={styles.devToggleContainer}>
                    <TouchableOpacity onPress={toggleRole} style={styles.devToggleBtn}>
                        <FontAwesome5 name="user-cog" size={14} color="#FFF" />
                        <Text style={styles.devToggleText}>
                            Switch to {currentRole === 'landlord' ? 'Super Admin' : 'Landlord'}
                        </Text>
                    </TouchableOpacity>
                </View>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#1A1A1A', // Estatein Grey/08
        height: '100%',
    },
    sidebarWrapper: {
        width: 240,
        display: Platform.OS === 'web' ? 'flex' : 'none', // Hide on mobile for now
        zIndex: 10,
    },
    mainContent: {
        flex: 1,
        position: 'relative', // For absolute positioning of dev toggle
    },

    // Dev Toggle Button
    devToggleContainer: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        zIndex: 100,
    },
    devToggleBtn: {
        backgroundColor: '#7C3AED',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    devToggleText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    }
});
