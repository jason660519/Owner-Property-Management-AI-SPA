import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Platform } from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';

// --- Types ---

type AdminStatProps = {
    title: string;
    value: string;
    trend: string;
    isPositive: boolean;
};

type AlertItemProps = {
    type: 'critical' | 'warning' | 'info';
    message: string;
    time: string;
};

// --- Components ---

const AdminStatCard = ({ title, value, trend, isPositive }: AdminStatProps) => (
    <View style={styles.statCard}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statValue}>{value}</Text>
        <View style={styles.trendRow}>
            <FontAwesome5
                name={isPositive ? "arrow-up" : "arrow-down"}
                size={10}
                color={isPositive ? "#10B981" : "#EF4444"}
                style={{ marginRight: 4 }}
            />
            <Text style={[styles.trendText, { color: isPositive ? "#10B981" : "#EF4444" }]}>
                {trend} vs last month
            </Text>
        </View>
    </View>
);

const AlertItem = ({ type, message, time }: AlertItemProps) => {
    let color = '#64748B';
    let icon = 'info-circle';
    if (type === 'critical') { color = '#EF4444'; icon = 'exclamation-circle'; }
    if (type === 'warning') { color = '#F59E0B'; icon = 'exclamation-triangle'; }

    return (
        <View style={styles.alertItem}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 }}>
                <FontAwesome5 name={icon} size={16} color={color} />
                <Text style={styles.alertText} numberOfLines={1}>{message}</Text>
            </View>
            <Text style={styles.alertTime}>{time}</Text>
        </View>
    );
};

// --- Main Component ---

export default function SuperAdminDashboard() {
    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.pageTitle}>System Overview</Text>
                        <Text style={styles.pageSubtitle}>Super Admin Control Panel</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.iconBtn}><FontAwesome5 name="bell" size={18} color="#FFF" /></TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn}><FontAwesome5 name="cog" size={18} color="#FFF" /></TouchableOpacity>
                    </View>
                </View>

                {/* Stats Row */}
                <View style={styles.statsContainer}>
                    <AdminStatCard title="TOTAL USERS" value="12,450" trend="12%" isPositive={true} />
                    <AdminStatCard title="ACTIVE SUBSCRIPTIONS" value="8,920" trend="8%" isPositive={true} />
                    <AdminStatCard title="MONTHLY REVENUE" value="$425.5K" trend="2.1%" isPositive={false} />
                    <AdminStatCard title="SYSTEM UP-TIME" value="99.9%" trend="Stable" isPositive={true} />
                </View>

                <View style={styles.gridContainer}>

                    {/* Main Chart Area (Left) */}
                    <View style={[styles.card, { flex: 2, minHeight: 300 }]}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Platform Growth</Text>
                            <TouchableOpacity style={styles.btnSmall}><Text style={styles.btnTextSmall}>Export</Text></TouchableOpacity>
                        </View>
                        <View style={styles.chartArea}>
                            {/* Mock Chart Visualization */}
                            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 180, gap: 16, justifyContent: 'center' }}>
                                {[40, 60, 45, 70, 85, 60, 75, 90, 80, 95].map((h, i) => (
                                    <View key={i} style={[styles.bar, { height: `${h}%`, opacity: i > 6 ? 1 : 0.4 }]} />
                                ))}
                            </View>
                            <View style={styles.chartXAxis}>
                                <Text style={styles.axisLabel}>Jan</Text>
                                <Text style={styles.axisLabel}>Feb</Text>
                                <Text style={styles.axisLabel}>Mar</Text>
                                <Text style={styles.axisLabel}>Apr</Text>
                                <Text style={styles.axisLabel}>May</Text>
                            </View>
                        </View>
                    </View>

                    {/* Side Panel (Right) */}
                    <View style={{ flex: 1, gap: 20 }}>

                        {/* System Alerts */}
                        <View style={[styles.card, { flex: 1 }]}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>System Alerts</Text>
                                <View style={styles.badge}><Text style={styles.badgeText}>3 New</Text></View>
                            </View>
                            <View style={{ gap: 4 }}>
                                <AlertItem type="critical" message="Database latency high (Asia-East)" time="2m ago" />
                                <AlertItem type="warning" message="Payment gateway timeout (Stripe)" time="15m ago" />
                                <AlertItem type="info" message="Daily backup completed" time="4h ago" />
                            </View>
                            <TouchableOpacity style={styles.linkBtn}>
                                <Text style={styles.linkText}>View All Logs</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Recent Signups */}
                        <View style={[styles.card, { flex: 1 }]}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>Recent Signups</Text>
                            </View>
                            <View style={{ padding: 16, gap: 16 }}>
                                <View style={styles.userRow}>
                                    <View style={styles.avatar}><Text style={styles.avatarText}>JD</Text></View>
                                    <View>
                                        <Text style={styles.userName}>John Doe</Text>
                                        <Text style={styles.userRole}>Landlord • Pro Plan</Text>
                                    </View>
                                </View>
                                <View style={styles.userRow}>
                                    <View style={[styles.avatar, { backgroundColor: '#10B981' }]}><Text style={styles.avatarText}>AS</Text></View>
                                    <View>
                                        <Text style={styles.userName}>Alice Smith</Text>
                                        <Text style={styles.userRole}>Tenant • Basic</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                    </View>
                </View>

            </ScrollView>
        </View>
    );
}

// --- Styles (Estatein Dark Mode) ---

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1A1A1A', // Grey/08
    },
    scrollContent: {
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    pageTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
    },
    pageSubtitle: {
        fontSize: 14,
        color: '#999',
        marginTop: 4,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#2A2A2A',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },

    // Stats
    statsContainer: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 32,
        flexWrap: 'wrap',
    },
    statCard: {
        flex: 1,
        minWidth: 200,
        backgroundColor: '#2A2A2A',
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: '#333',
    },
    statTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#999',
        letterSpacing: 1,
        marginBottom: 8,
    },
    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 8,
    },
    trendRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    trendText: {
        fontSize: 12,
        fontWeight: '500',
    },

    // Grid
    gridContainer: {
        flexDirection: Platform.OS === 'web' ? 'row' : 'column',
        gap: 24,
    },
    card: {
        backgroundColor: '#2A2A2A',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        overflow: 'hidden',
    },
    cardHeader: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
    },
    btnSmall: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#333',
        borderRadius: 6,
    },
    btnTextSmall: {
        color: '#DDD',
        fontSize: 12,
    },
    badge: {
        backgroundColor: '#EF4444',
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 10,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },

    // Chart
    chartArea: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bar: {
        width: 24,
        backgroundColor: '#7C3AED',
        borderRadius: 4,
    },
    chartXAxis: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 16,
        paddingHorizontal: 40,
    },
    axisLabel: {
        color: '#666',
        fontSize: 12,
    },

    // Alerts
    alertItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    alertText: {
        color: '#DDD',
        fontSize: 13,
        flex: 1,
    },
    alertTime: {
        color: '#666',
        fontSize: 11,
        marginLeft: 8,
    },
    linkBtn: {
        padding: 16,
        alignItems: 'center',
    },
    linkText: {
        color: '#7C3AED',
        fontWeight: '600',
        fontSize: 13,
    },

    // Users
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#7C3AED',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    userName: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 14,
    },
    userRole: {
        color: '#888',
        fontSize: 12,
    },
});
