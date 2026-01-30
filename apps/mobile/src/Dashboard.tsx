import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Dimensions } from 'react-native';
import Sidebar from './components/Sidebar';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';

// Types for components
type StatCardProps = {
  icon: string;
  label: string;
  count: number;
  iconColor?: string;
};

type ActionItemProps = {
  icon: string;
  label: string;
};

// Components
const StatCard = ({ icon, label, count, iconColor = '#5c7c94' }: StatCardProps) => (
  <View style={styles.statCard}>
    <FontAwesome5 name={icon} size={24} color={iconColor} style={{marginBottom: 8}} />
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statCount}>{count}</Text>
  </View>
);

const ResidencyStat = ({ icon, label, count }: StatCardProps) => (
  <View style={styles.residencyStat}>
    <FontAwesome5 name={icon} size={20} color="#345465" style={{marginBottom: 8}} />
    <Text style={styles.resLabel}>{label}</Text>
    <Text style={styles.resCount}>{count}</Text>
  </View>
);

const ActionRow = ({ icon, label }: ActionItemProps) => (
  <TouchableOpacity style={styles.actionRow}>
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
        <FontAwesome5 name={icon} size={16} color="#5c7c94" />
        <Text style={styles.actionLabel}>{label}</Text>
    </View>
    <MaterialIcons name="chevron-right" size={20} color="#ccc" />
  </TouchableOpacity>
);

export default function Dashboard() {
  const [maintenanceTask, setMaintenanceTask] = useState('');

  const isWeb = Platform.OS === 'web';
  const screenWidth = Dimensions.get('window').width;
  const isLargeScreen = screenWidth > 900; 

  return (
    <View style={styles.container}>
      {/* Sidebar - typically hidden on mobile but shown here for desktop dashboard */}
      <View style={styles.sidebarWrapper}>
         <Sidebar />
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        <View style={styles.header}>
            <Text style={styles.welcomeText}>Hello, Yi-Fan</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.contentGrid}>
                
                {/* Left Column */}
                <View style={[styles.mainColumn, { flex: 2 }]}>
                    
                    {/* Banner */}
                    <View style={styles.banner}>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1}}>
                            <View style={styles.bannerIconBg}>
                                <FontAwesome5 name="home" size={24} color="#2c7da0" />
                            </View>
                            <View>
                                <Text style={styles.bannerTitle}>Finish adding your rentals</Text>
                                <Text style={styles.bannerSubtitle}>1 of 3 units added.</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.bannerButton}>
                            <Text style={styles.bannerButtonText}>ADD A RENTAL</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Vacancy Section */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionHeader}>VACANCY</Text>
                            <MaterialIcons name="open-in-full" size={16} color="#5c7c94" />
                        </View>
                        <View style={styles.statsGrid}>
                            <StatCard icon="home" label="MARKETING ON" count={0} />
                            <StatCard icon="users" label="LEADS" count={0} />
                            <StatCard icon="user-tie" label="APPLICANTS" count={0} />
                            <StatCard icon="calendar-check" label="SHOWINGS" count={0} />
                        </View>
                    </View>

                    {/* Residency Section */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionHeader}>RESIDENCY</Text>
                            <MaterialIcons name="open-in-full" size={16} color="#5c7c94" />
                        </View>

                        {/* Financials */}
                        <View style={styles.financialsRow}>
                             {/* Placeholder for Rent Collected */}
                             <View style={styles.financialBox}>
                                 <View style={styles.finHeader}>
                                     <Text style={styles.finTitle}>January Payments</Text>
                                     <View style={styles.toggleGroup}>
                                         <Text style={[styles.toggleBtn, styles.toggleActive]}>Month</Text>
                                         <Text style={styles.toggleBtn}>Year</Text>
                                     </View>
                                 </View>
                                 <View style={{flexDirection: 'row', marginTop: 15, gap: 20}}>
                                     <View style={{flex:1}}>
                                         <Text style={styles.finLabel}>RENT COLLECTED</Text>
                                         <Text style={styles.finAmountGreen}>$0</Text>
                                     </View>
                                     <View style={{flex:1}}>
                                         <Text style={styles.finLabel}>PAST DUE</Text>
                                         <Text style={styles.finAmountRed}>$0</Text>
                                     </View>
                                 </View>
                                 <View style={styles.finFooter}>
                                     <TouchableOpacity style={styles.textBtn}><Text style={styles.blueLink}>RECORD PAYMENT</Text></TouchableOpacity>
                                     <TouchableOpacity style={styles.textBtn}><Text style={styles.blueLink}>SET UP PAYMENTS</Text></TouchableOpacity>
                                 </View>
                             </View>
                        </View>
                        
                        {/* Residency Stats Row */}
                        <View style={styles.statsGrid}>
                            <ResidencyStat icon="users" label="TENANTS" count={0} />
                            <ResidencyStat icon="file-contract" label="LEASES" count={0} />
                            <ResidencyStat icon="clipboard-list" label="CONDITION REPORTS" count={0} />
                            <ResidencyStat icon="signature" label="E-SIGN" count={0} />
                        </View>
                    </View>

                    {/* Maintenance Section */}
                     <View style={styles.sectionContainer}>
                        <View style={{padding: 20}}>
                            <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15}}>
                                <FontAwesome5 name="tools" size={20} color="#2c3e50" />
                                <Text style={styles.cardTitle}>What's on your Maintenance to-do list?</Text>
                            </View>
                            
                            <View style={styles.inputWrapper}>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="Add a task" 
                                    value={maintenanceTask}
                                    onChangeText={setMaintenanceTask}
                                />
                                <TouchableOpacity>
                                    <MaterialIcons name="arrow-forward" size={24} color="#5c7c94" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.tagsRow}>
                                <Text style={styles.tag}>+ New</Text>
                                <Text style={styles.tag}>+ Air Filters</Text>
                                <Text style={styles.tag}>+ Landscaping</Text>
                                <Text style={styles.tag}>+ Check Exterior</Text>
                                <Text style={styles.tag}>+ HVAC Checkup</Text>
                            </View>
                        </View>
                     </View>

                </View>

                {/* Right Column (Side Widgets) */}
                <View style={[styles.sideColumn, { flex: 1 }]}>
                    
                    {/* Promo Card */}
                    <View style={styles.promoCard}>
                        <View style={{flexDirection: 'row', gap: 15}}>
                             <View style={styles.promoIconBg}>
                                 <FontAwesome5 name="chart-line" size={24} color="#2c7da0" />
                             </View>
                             <View style={{flex: 1}}>
                                 <Text style={styles.promoTitle}>Using spreadsheets to track your finances?</Text>
                             </View>
                        </View>
                        <Text style={styles.promoText}>
                            Automatically track revenue, expenses, loans, and more! Get insights on your rentals and turn tax season, into relax season.
                        </Text>
                        <TouchableOpacity style={styles.outlineBtn}>
                            <Text style={styles.outlineBtnText}>UPGRADE YOUR ACCOUNTING</Text>
                        </TouchableOpacity>
                        <View style={styles.carouselDots}>
                             <View style={[styles.dot, styles.activeDot]} />
                             <View style={styles.dot} />
                             <View style={styles.dot} />
                             <View style={styles.dot} />
                             <View style={styles.dot} />
                        </View>
                    </View>

                    {/* Quick Actions List */}
                    <View style={styles.actionsList}>
                        <ActionItem icon="search" label="Screen a Tenant" />
                        <ActionItem icon="user-plus" label="Invite to Apply" />
                        <ActionItem icon="file-contract" label="Get a Lease Agreement" />
                        <ActionItem icon="plus-square" label="Build a Lease Addendum" />
                        <ActionItem icon="file-signature" label="E-Sign a Document" />
                        <ActionItem icon="file-alt" label="Get Landlord Forms" />
                        <ActionItem icon="receipt" label="Record an Expense" />
                        <ActionItem icon="mobile-alt" label="Download the App" />
                    </View>

                </View>

            </View>
        </ScrollView>
      </View>
    </View>
  );
}

const ActionItem = ({icon, label}: any) => (
    <TouchableOpacity style={styles.actionRow}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
            <View style={{width: 24, alignItems: 'center'}}>
                <FontAwesome5 name={icon} size={16} color="#5c7c94" />
            </View>
            <Text style={styles.actionLabel}>{label}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color="#ccc" />
    </TouchableOpacity>
)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f4f7f9',
    height: '100%', 
  },
  sidebarWrapper: {
      width: 240,
      borderRightWidth: 1,
      borderRightColor: '#e1e4e8',
      display: Platform.OS === 'web' ? 'flex' : 'none', // Hide on mobile for now
  },
  mainContent: {
      flex: 1,
      padding: 0,
  },
  header: {
      padding: 30,
      paddingBottom: 20,
  },
  welcomeText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#0f2e46',
  },
  contentGrid: {
      flexDirection: Platform.OS === 'web' ? 'row' : 'column',
      padding: 20,
      gap: 20,
      maxWidth: 1200, 
  },
  mainColumn: {
      gap: 20,
      minWidth: 300,
  },
  sideColumn: {
      gap: 20,
      minWidth: 300,
  },
  banner: {
      backgroundColor: '#fff',
      padding: 20,
      borderRadius: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      ...Platform.select({
        web: {
            boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.05)',
        },
        default: {
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 5,
            elevation: 2,
        }
      }),
  },
  bannerIconBg: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: '#4db6ac', // teal
      alignItems: 'center',
      justifyContent: 'center'
  },
  bannerTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#0f2e46',
  },
  bannerSubtitle: {
      color: '#2c7da0',
      textDecorationLine: 'underline',
      marginTop: 2,
  },
  bannerButton: {
      backgroundColor: '#0f2e46',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 20,
  },
  bannerButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 12,
  },
  sectionContainer: {
      backgroundColor: '#fff',
      borderRadius: 4,
      ...Platform.select({
        web: {
            boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.05)',
        },
        default: {
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 5,
            elevation: 2,
        }
      }),
      overflow: 'hidden',
  },
  sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 15,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
  },
  sectionHeader: {
      color: '#8898aa',
      fontWeight: 'bold',
      fontSize: 12,
      letterSpacing: 1,
  },
  statsGrid: {
      flexDirection: 'row',
      padding: 0,
      borderTopWidth: 1, 
      borderTopColor: '#f0f0f0'
  },
  statCard: {
      flex: 1,
      alignItems: 'center',
      padding: 24,
      borderRightWidth: 1,
      borderRightColor: '#f0f0f0',
  },
  statLabel: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#8898aa',
      marginTop: 5,
      textAlign: 'center'
  },
  statCount: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#0f2e46',
      marginTop: 5,
  },
  residencyStat: {
      flex: 1,
      alignItems: 'center',
      padding: 20,
      borderRightWidth: 1,
      borderRightColor: '#f0f0f0',
  },
  resLabel: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#8898aa',
      marginBottom: 5,
      textAlign: 'center'
  },
  resCount: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#0f2e46',
  },
  financialsRow: {
      padding: 20,
  },
  financialBox: {
      
  },
  finHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  finTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#0f2e46',
  },
  toggleGroup: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: '#cfd8dc',
      borderRadius: 4,
  },
  toggleBtn: {
      paddingVertical: 5,
      paddingHorizontal: 12,
      fontSize: 12,
      color: '#5c7c94',
  },
  toggleActive: {
      backgroundColor: '#0f2e46',
      color: '#fff',
  },
  finLabel: {
      fontSize: 11,
      fontWeight: 'bold',
      color: '#8898aa',
      marginBottom: 5,
  },
  finAmountGreen: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#00bfa5',
  },
  finAmountRed: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#ff5252',
  },
  finFooter: {
      flexDirection: 'row',
      borderColor: '#eee',
      borderTopWidth: 1,
      marginTop: 20,
      paddingTop: 15,
  },
  textBtn: {
      flex: 1,
      alignItems: 'center',
      borderRightWidth: 1,
      borderRightColor: '#eee',
  },
  blueLink: {
      color: '#1565c0',
      fontWeight: 'bold',
      fontSize: 12,
  },
  cardTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#0f2e46',
  },
  inputWrapper: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: '#cfd8dc',
      borderRadius: 4,
      alignItems: 'center',
      paddingHorizontal: 10,
      marginBottom: 15,
  },
  input: {
      flex: 1,
      paddingVertical: 10,
      outlineStyle: 'none',
  },
  tagsRow: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
  },
  tag: {
      backgroundColor: '#eceff1',
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 'bold',
      color: '#546e7a',
  },
  promoCard: {
      backgroundColor: '#fff',
      padding: 25,
      borderRadius: 4,
      ...Platform.select({
        web: {
            boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.05)',
        },
        default: {
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 5,
            elevation: 2,
        }
      }),
      alignItems: 'center',
  },
  promoIconBg: {
      // styles for circle icon
  },
  promoTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#0f2e46',
      marginBottom: 10,
  },
  promoText: {
      color: '#5c7c94',
      textAlign: 'center',
      marginBottom: 20,
      lineHeight: 20,
      fontSize: 13,
  },
  outlineBtn: {
      borderWidth: 1,
      borderColor: '#0f2e46',
      borderRadius: 20,
      paddingVertical: 10,
      paddingHorizontal: 20,
      marginBottom: 20,
  },
  outlineBtnText: {
      color: '#0f2e46',
      fontWeight: 'bold',
      fontSize: 11,
  },
  carouselDots: {
      flexDirection: 'row',
      gap: 8,
  },
  dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#cfd8dc',
  },
  activeDot: {
      backgroundColor: '#0f2e46',
  },
  actionsList: {
      backgroundColor: '#fff',
      borderRadius: 4,
      ...Platform.select({
        web: {
            boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.05)',
        },
        default: {
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 5,
            elevation: 2,
        }
      }),
  },
  actionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
  },
  actionLabel: {
      fontSize: 14,
      color: '#2c3e50',
      fontWeight: '500',
  },
});
