import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Dimensions } from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';

// Types
type StatCardProps = {
  icon: string;
  label: string;
  count: number;
};

type ActionItemProps = {
  icon: string;
  label: string;
};

// --- Components ---

const StatCard = ({ icon, label, count }: StatCardProps) => (
  <View style={styles.statCard}>
    <View style={styles.iconContainer}>
      <FontAwesome5 name={icon} size={20} color="#FFFFFF" />
    </View>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statCount}>{count}</Text>
  </View>
);

const ResidencyStat = ({ icon, label, count }: StatCardProps) => (
  <View style={styles.residencyStat}>
    <View style={styles.iconContainerSmall}>
        <FontAwesome5 name={icon} size={16} color="#FFFFFF" />
    </View>
    <Text style={styles.resLabel}>{label}</Text>
    <Text style={styles.resCount}>{count}</Text>
  </View>
);

const ActionItem = ({ icon, label }: ActionItemProps) => (
  <TouchableOpacity style={styles.actionRow}>
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
        <View style={styles.actionIconBg}>
            <FontAwesome5 name={icon} size={14} color="#7C3AED" />
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
    </View>
    <MaterialIcons name="chevron-right" size={20} color="#666" />
  </TouchableOpacity>
);

// --- Main Component ---

export default function LandlordDashboard() {
  const [maintenanceTask, setMaintenanceTask] = useState('');
  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header Section */}
        <View style={styles.header}>
            <View>
                <Text style={styles.welcomeText}>Welcome back, Landlord</Text>
                <Text style={styles.subHeader}>Here is what's happening with your properties today.</Text>
            </View>
            <TouchableOpacity style={styles.primaryBtn}>
                <FontAwesome5 name="plus" size={12} color="#FFF" style={{marginRight: 8}} />
                <Text style={styles.primaryBtnText}>Add Property</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.contentGrid}>
            
            {/* Left Column (Main Stats) */}
            <View style={[styles.mainColumn, { flex: 2 }]}>
                
                {/* Banner */}
                <View style={styles.banner}>
                    <View style={styles.bannerContent}>
                        <View style={styles.bannerIconBg}>
                            <FontAwesome5 name="home" size={24} color="#7C3AED" />
                        </View>
                        <View style={{flex: 1}}>
                            <Text style={styles.cardHeader}>Complete your portfolio</Text>
                            <Text style={styles.cardSubtext}>You have added 1 of 3 units. Finish setting up to unlock full insights.</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.outlineBtn}>
                        <Text style={styles.outlineBtnText}>Continue Setup</Text>
                    </TouchableOpacity>
                </View>

                {/* Vacancy / Marketing Section */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionHeader}>RENTAL PERFORMANCE</Text>
                        <TouchableOpacity><Text style={styles.linkText}>View All</Text></TouchableOpacity>
                    </View>
                    <View style={styles.statsGrid}>
                        <StatCard icon="bullhorn" label="Marketing" count={2} />
                        <StatCard icon="user-friends" label="Leads" count={5} />
                        <StatCard icon="file-signature" label="Applicants" count={1} />
                        <StatCard icon="key" label="Showings" count={3} />
                    </View>
                </View>

                {/* Financials Section */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionHeader}>FINANCIAL OVERVIEW</Text>
                        <View style={styles.toggleGroup}>
                             <Text style={[styles.toggleBtn, styles.toggleActive]}>Month</Text>
                             <Text style={styles.toggleBtn}>YTD</Text>
                        </View>
                    </View>

                    <View style={styles.financialsRow}>
                         <View style={styles.finBox}>
                             <Text style={styles.finLabel}>TOTAL REVENUE</Text>
                             <Text style={styles.finAmountGreen}>$12,500</Text>
                         </View>
                         <View style={styles.verticalDivider} />
                         <View style={styles.finBox}>
                             <Text style={styles.finLabel}>OUTSTANDING</Text>
                             <Text style={styles.finAmountRed}>$1,200</Text>
                         </View>
                    </View>
                    
                    <View style={styles.chartPlaceholder}>
                        {/* Placeholder for a Chart */}
                        <View style={styles.barContainer}>
                            <View style={[styles.bar, {height: '40%'}]} />
                            <View style={[styles.bar, {height: '60%'}]} />
                            <View style={[styles.bar, {height: '30%'}]} />
                            <View style={[styles.bar, {height: '80%'}]} />
                            <View style={[styles.bar, {height: '50%'}]} />
                            <View style={[styles.bar, {height: '90%', backgroundColor: '#7C3AED'}]} />
                            <View style={[styles.bar, {height: '70%'}]} />
                        </View>
                        <Text style={styles.chartLabel}>Income vs Expense (Last 6 Months)</Text>
                    </View>
                </View>

            </View>

            {/* Right Column (Actions & Maintenance) */}
            <View style={[styles.sideColumn, { flex: 1 }]}>
                
                {/* Maintenance Widget */}
                 <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionHeader}>MAINTENANCE</Text>
                    </View>
                    <View style={{padding: 20}}>
                        <Text style={styles.cardTitle}>Quick Task</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput 
                                style={styles.input} 
                                placeholder="Add a to-do..." 
                                placeholderTextColor="#666"
                                value={maintenanceTask}
                                onChangeText={setMaintenanceTask}
                            />
                            <TouchableOpacity style={styles.iconBtn}>
                                <MaterialIcons name="add" size={20} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.tagsRow}>
                            <Text style={styles.tag}>HVAC Check</Text>
                            <Text style={styles.tag}>Plumbing</Text>
                            <Text style={styles.tag}>Pest Control</Text>
                        </View>
                    </View>
                 </View>

                {/* Quick Actions List */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionHeader}>QUICK ACTIONS</Text>
                    </View>
                    <View>
                        <ActionItem icon="search" label="Screen Tenant" />
                        <ActionItem icon="file-contract" label="Create Lease" />
                        <ActionItem icon="receipt" label="Record Expense" />
                        <ActionItem icon="tools" label="Request Repair" />
                    </View>
                </View>

            </View>

        </View>
      </ScrollView>
    </View>
  );
}

// --- Styles (Dark Mode - Estatein Theme) ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A', // Grey/08
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
      padding: 30,
      paddingBottom: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: '#333',
  },
  welcomeText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#FFFFFF',
      marginBottom: 4,
  },
  subHeader: {
      fontSize: 14,
      color: '#999999',
  },
  primaryBtn: {
      backgroundColor: '#7C3AED', // Purple/60
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 10,
  },
  primaryBtnText: {
      color: '#FFF',
      fontWeight: '600',
      fontSize: 14,
  },
  contentGrid: {
      flexDirection: Platform.OS === 'web' ? 'row' : 'column',
      padding: 20,
      gap: 20,
      maxWidth: 1440, 
      alignSelf: 'center',
      width: '100%',
  },
  mainColumn: {
      gap: 20,
      minWidth: 300,
  },
  sideColumn: {
      gap: 20,
      minWidth: 300,
  },
  
  // Cards & Sections
  sectionContainer: {
      backgroundColor: '#2A2A2A', // Grey/10
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#333', // Grey/15
      overflow: 'hidden',
  },
  sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#333',
  },
  sectionHeader: {
      color: '#999',
      fontWeight: '600',
      fontSize: 12,
      letterSpacing: 1,
  },
  linkText: {
      color: '#7C3AED',
      fontSize: 12,
      fontWeight: 'bold',
  },

  // Banner
  banner: {
      backgroundColor: '#252525',
      padding: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#333',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
  },
  bannerContent: {
      flexDirection: 'row', 
      alignItems: 'center', 
      gap: 16, 
      flex: 1
  },
  bannerIconBg: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(124, 58, 237, 0.1)', // Purple tint
      alignItems: 'center',
      justifyContent: 'center'
  },
  cardHeader: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#FFF',
      marginBottom: 4,
  },
  cardSubtext: {
      color: '#999',
      fontSize: 13,
  },
  outlineBtn: {
      borderWidth: 1,
      borderColor: '#7C3AED',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
  },
  outlineBtnText: {
      color: '#7C3AED', // Purple
      fontWeight: '600',
      fontSize: 12,
  },

  // Stats
  statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
  },
  statCard: {
      flex: 1,
      minWidth: 100,
      alignItems: 'center',
      padding: 20,
      borderRightWidth: 1,
      borderRightColor: '#333',
  },
  iconContainer: {
      width: 40, 
      height: 40, 
      borderRadius: 20, 
      backgroundColor: 'rgba(124, 58, 237, 0.2)', 
      alignItems: 'center', 
      justifyContent: 'center',
      marginBottom: 10
  },
  iconContainerSmall: {
      marginBottom: 8
  },
  statLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: '#999',
      marginBottom: 4,
      textTransform: 'uppercase'
  },
  statCount: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#FFF',
  },
  residencyStat: {
      flex: 1,
      alignItems: 'center',
      padding: 16,
  },
  resLabel: {
      fontSize: 10,
      color: '#999',
      marginBottom: 4,
  },
  resCount: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#FFF',
  },

  // Financials
  financialsRow: {
      flexDirection: 'row',
      padding: 24,
      borderBottomWidth: 1,
      borderBottomColor: '#333',
  },
  finBox: {
      flex: 1,
      alignItems: 'center',
  },
  verticalDivider: {
      width: 1,
      backgroundColor: '#333',
      marginHorizontal: 10,
  },
  finLabel: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#999',
      marginBottom: 8,
      letterSpacing: 0.5,
  },
  finAmountGreen: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#10B981', // Success Green
  },
  finAmountRed: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#EF4444', // Danger Red
  },
  toggleGroup: {
      flexDirection: 'row',
      backgroundColor: '#1A1A1A',
      borderRadius: 8,
      padding: 2,
  },
  toggleBtn: {
      paddingVertical: 4,
      paddingHorizontal: 12,
      fontSize: 11,
      color: '#666',
      borderRadius: 6,
  },
  toggleActive: {
      backgroundColor: '#333',
      color: '#FFF',
  },
  chartPlaceholder: {
      padding: 24,
      alignItems: 'center',
  },
  barContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      height: 100,
      gap: 12,
      marginBottom: 12,
  },
  bar: {
      width: 20,
      backgroundColor: '#333',
      borderRadius: 4,
  },
  chartLabel: {
      color: '#666',
      fontSize: 12,
  },

  // Actions
  actionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#333',
  },
  actionIconBg: {
      width: 28,
      height: 28,
      borderRadius: 6,
      backgroundColor: 'rgba(124, 58, 237, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
  },
  actionLabel: {
      fontSize: 14,
      color: '#DDD',
      fontWeight: '500',
  },

  // Widget
  cardTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#FFF',
      marginBottom: 12,
  },
  inputWrapper: {
      flexDirection: 'row',
      backgroundColor: '#1A1A1A',
      borderRadius: 8,
      alignItems: 'center',
      paddingHorizontal: 10,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: '#333',
  },
  input: {
      flex: 1,
      paddingVertical: 12,
      color: '#FFF',
      outlineStyle: 'none',
  },
  iconBtn: {
      backgroundColor: '#7C3AED',
      padding: 4,
      borderRadius: 4,
  },
  tagsRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
  },
  tag: {
      backgroundColor: '#333',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 12,
      fontSize: 11,
      color: '#AAA',
  },
});
