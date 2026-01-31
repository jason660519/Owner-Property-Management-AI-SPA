import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform, Dimensions } from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { cssInterop } from "nativewind";

// Hardcoded matching colors from tailwind.config.js
const ICON_COLORS = {
  white: '#ffffff',
  grey60: '#999999',
  purple60: '#703BF7',
  success: '#09cf82',
  warning: '#c5221f', // Using error for warning/danger text in original
};

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
  <View className="flex-1 min-w-[100px] items-center p-5 border-r border-border-light">
    <View className="w-10 h-10 rounded-full bg-accent/20 items-center justify-center mb-2.5">
      <FontAwesome5 name={icon} size={20} color={ICON_COLORS.white} />
    </View>
    <Text className="text-[11px] font-semibold text-text-muted mb-1 uppercase">{label}</Text>
    <Text className="text-2xl font-bold text-text-primary">{count}</Text>
  </View>
);

const ActionItem = ({ icon, label }: ActionItemProps) => (
  <TouchableOpacity className="flex-row justify-between items-center p-4 border-b border-border-light">
    <View className="flex-row items-center gap-3">
        <View className="w-7 h-7 rounded-md bg-accent/10 items-center justify-center">
            <FontAwesome5 name={icon} size={14} color={ICON_COLORS.purple60} />
        </View>
        <Text className="text-sm text-text-primary font-medium">{label}</Text>
    </View>
    <MaterialIcons name="chevron-right" size={20} color={ICON_COLORS.grey60} />
  </TouchableOpacity>
);

// --- Main Component ---

export default function LandlordDashboard() {
  const [maintenanceTask, setMaintenanceTask] = useState('');
  
  // Tailwind responsive classes handles layout, so explicit isWeb check is less critical for styles, 
  // but helpful for platform specific behavior if needed.
  const isWeb = Platform.OS === 'web';

  return (
    <View className="flex-1 bg-bg-primary">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Header Section */}
        <View className="p-8 pb-5 flex-row justify-between items-center border-b border-border-light">
            <View>
                <Text className="text-2xl font-bold text-text-primary mb-1">Welcome back, Landlord</Text>
                <Text className="text-sm text-text-muted">Here is what's happening with your properties today.</Text>
            </View>
            <TouchableOpacity className="bg-accent flex-row items-center py-2.5 px-5 rounded-md">
                <FontAwesome5 name="plus" size={12} color={ICON_COLORS.white} style={{marginRight: 8}} />
                <Text className="text-text-primary font-semibold text-sm">Add Property</Text>
            </TouchableOpacity>
        </View>

        <View className={`p-5 gap-5 self-center w-full max-w-[1440px] ${isWeb ? 'flex-row' : 'flex-col'}`}>
            
            {/* Left Column (Main Stats) */}
            <View className="flex-[2] gap-5 min-w-[300px]">
                
                {/* Banner */}
                <View className="bg-[#252525] p-6 rounded-base border border-border-light flex-row items-center justify-between gap-4">
                    <View className="flex-row items-center gap-4 flex-1">
                        <View className="w-12 h-12 rounded-full bg-accent/10 items-center justify-center">
                            <FontAwesome5 name="home" size={24} color={ICON_COLORS.purple60} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-bold text-text-primary mb-1">Complete your portfolio</Text>
                            <Text className="text-sm text-text-muted">You have added 1 of 3 units. Finish setting up to unlock full insights.</Text>
                        </View>
                    </View>
                    <TouchableOpacity className="border border-accent py-2 px-4 rounded-md">
                        <Text className="text-accent font-semibold text-xs">Continue Setup</Text>
                    </TouchableOpacity>
                </View>

                {/* Vacancy / Marketing Section */}
                <View className="bg-bg-secondary rounded-base border border-border-light overflow-hidden">
                    <View className="flex-row justify-between items-center p-4 border-b border-border-light">
                        <Text className="text-text-muted font-semibold text-xs tracking-widest">RENTAL PERFORMANCE</Text>
                        <TouchableOpacity><Text className="text-accent text-xs font-bold">View All</Text></TouchableOpacity>
                    </View>
                    <View className="flex-row flex-wrap">
                        <StatCard icon="bullhorn" label="Marketing" count={2} />
                        <StatCard icon="user-friends" label="Leads" count={5} />
                        <StatCard icon="file-signature" label="Applicants" count={1} />
                        <StatCard icon="key" label="Showings" count={3} />
                    </View>
                </View>

                {/* Financials Section */}
                <View className="bg-bg-secondary rounded-base border border-border-light overflow-hidden">
                    <View className="flex-row justify-between items-center p-4 border-b border-border-light">
                        <Text className="text-text-muted font-semibold text-xs tracking-widest">FINANCIAL OVERVIEW</Text>
                        <View className="flex-row bg-bg-primary rounded-md p-0.5">
                             <Text className="py-1 px-3 text-[11px] text-text-primary bg-bg-tertiary rounded-md">Month</Text>
                             <Text className="py-1 px-3 text-[11px] text-text-muted">YTD</Text>
                        </View>
                    </View>

                    <View className="flex-row p-6 border-b border-border-light">
                         <View className="flex-1 items-center">
                             <Text className="text-[10px] font-bold text-text-muted mb-2 tracking-wider">TOTAL REVENUE</Text>
                             <Text className="text-3xl font-bold text-status-success">$12,500</Text>
                         </View>
                         <View className="w-[1px] bg-border-light mx-2.5" />
                         <View className="flex-1 items-center">
                             <Text className="text-[10px] font-bold text-text-muted mb-2 tracking-wider">OUTSTANDING</Text>
                             <Text className="text-3xl font-bold text-status-warning">$1,200</Text>
                         </View>
                    </View>
                    
                    <View className="p-6 items-center">
                        {/* Placeholder for a Chart */}
                        <View className="flex-row items-end h-24 gap-3 mb-3">
                            <View className="w-5 bg-[#333] rounded-xs h-[40%]" />
                            <View className="w-5 bg-[#333] rounded-xs h-[60%]" />
                            <View className="w-5 bg-[#333] rounded-xs h-[30%]" />
                            <View className="w-5 bg-[#333] rounded-xs h-[80%]" />
                            <View className="w-5 bg-[#333] rounded-xs h-[50%]" />
                            <View className="w-5 bg-accent rounded-xs h-[90%]" />
                            <View className="w-5 bg-[#333] rounded-xs h-[70%]" />
                        </View>
                        <Text className="text-text-muted text-xs">Income vs Expense (Last 6 Months)</Text>
                    </View>
                </View>

            </View>

            {/* Right Column (Actions & Maintenance) */}
            <View className="flex-1 gap-5 min-w-[300px]">
                
                {/* Maintenance Widget */}
                 <View className="bg-bg-secondary rounded-base border border-border-light overflow-hidden">
                    <View className="flex-row justify-between items-center p-4 border-b border-border-light">
                        <Text className="text-text-muted font-semibold text-xs tracking-widest">MAINTENANCE</Text>
                    </View>
                    <View className="p-5">
                        <Text className="text-base font-bold text-text-primary mb-3">Quick Task</Text>
                        <View className="flex-row bg-[#1A1A1A] rounded-sm items-center px-2.5 mb-4 border border-border-light">
                            <TextInput 
                                className="flex-1 py-3 text-text-primary"
                                placeholder="Add a to-do..." 
                                placeholderTextColor="#666"
                                value={maintenanceTask}
                                onChangeText={setMaintenanceTask}
                            />
                            <TouchableOpacity className="bg-accent p-1 rounded-sm">
                                <MaterialIcons name="add" size={20} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row gap-2 flex-wrap">
                            <Text className="bg-[#333] py-1.5 px-3 rounded-base text-[11px] text-[#AAA]">HVAC Check</Text>
                            <Text className="bg-[#333] py-1.5 px-3 rounded-base text-[11px] text-[#AAA]">Plumbing</Text>
                            <Text className="bg-[#333] py-1.5 px-3 rounded-base text-[11px] text-[#AAA]">Pest Control</Text>
                        </View>
                    </View>
                 </View>

                {/* Quick Actions List */}
                <View className="bg-bg-secondary rounded-base border border-border-light overflow-hidden">
                    <View className="flex-row justify-between items-center p-4 border-b border-border-light">
                        <Text className="text-text-muted font-semibold text-xs tracking-widest">QUICK ACTIONS</Text>
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
