'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardImage, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Property } from '@/lib/api/properties';

interface PropertiesClientProps {
    initialProperties: Property[];
}

export default function PropertiesClient({ initialProperties }: PropertiesClientProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    const filteredProperties = initialProperties.filter(property => {
        const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            property.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            property.address.toLowerCase().includes(searchTerm.toLowerCase());

        // Note: property.type in our mapper returns '公寓'/'別墅' etc, or '出租物件' fallback
        // We need to match filter values
        const matchesType = filterType === 'all' || property.type === filterType;

        // property.status in mapper is 'sale' or 'rent'
        const matchesStatus = filterStatus === 'all' || property.status === filterStatus;

        return matchesSearch && matchesType && matchesStatus;
    });

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header & Search */}
            <div className="mb-12">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">尋找您的理想物業</h1>
                <p className="text-[#999999] mb-8">
                    瀏覽我們精選的物業列表，找到最適合您的家或投資標的。
                </p>

                <div className="bg-[#1A1A1A] p-6 rounded-xl border border-[#262626] flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="搜尋關鍵字 (如：公寓、台北市)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-[#141414] border-[#333333] h-12"
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <div className="relative">
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="w-full h-12 px-4 bg-[#141414] border border-[#333333] rounded-lg text-white appearance-none focus:outline-none focus:border-[#7C3AED]"
                            >
                                <option value="all">所有類型</option>
                                <option value="公寓">公寓</option>
                                <option value="別墅">別墅</option>
                                <option value="套房">套房</option>
                                <option value="商辦">商辦</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-[#999999]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>
                    <div className="w-full md:w-48">
                        <div className="relative">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full h-12 px-4 bg-[#141414] border border-[#333333] rounded-lg text-white appearance-none focus:outline-none focus:border-[#7C3AED]"
                            >
                                <option value="all">所有狀態</option>
                                <option value="sale">出售</option>
                                <option value="rent">出租</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-[#999999]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>
                    <Button className="md:w-32">搜尋</Button>
                </div>
            </div>

            {/* Properties Grid */}
            {filteredProperties.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredProperties.map((property) => (
                        <Link key={property.id} href={`/properties/${property.id}`} className="group">
                            <Card hoverable padding="md" className="h-full bg-[#1A1A1A] border-[#262626] group-hover:border-[#7C3AED]/50 transition-colors">
                                <CardImage
                                    src={property.imageUrl}
                                    alt={property.title}
                                    aspectRatio="16/9"
                                    className="group-hover:scale-105 transition-transform duration-500"
                                />
                                <CardContent>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-xs font-semibold px-2 py-1 rounded ${property.status === 'rent' ? 'bg-[#7C3AED]/20 text-[#7C3AED]' : 'bg-green-500/20 text-green-500'
                                            }`}>
                                            {property.status === 'rent' ? '出租' : '出售'}
                                        </span>
                                        <span className="text-[#999999] text-xs border border-[#333333] px-2 py-1 rounded">{property.type}</span>
                                    </div>

                                    <h3 className="text-xl font-bold mb-2 group-hover:text-[#7C3AED] transition-colors">{property.title}</h3>
                                    <p className="text-[#999999] text-sm mb-4 line-clamp-2">{property.description}</p>

                                    <div className="grid grid-cols-3 gap-4 border-t border-[#262626] pt-4 mb-2">
                                        <div className="flex items-center gap-2 text-sm text-[#CCCCCC]">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                            {property.bedrooms} 房
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-[#CCCCCC]">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            {property.bathrooms} 衛
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-[#CCCCCC]">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                            {property.area} 坪
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="mt-auto pt-4 border-t border-[#262626]">
                                    <span className="text-xl font-bold">{property.price}</span>
                                    <span className="text-[#7C3AED] text-sm font-medium hover:underline">查看詳情 &rarr;</span>
                                </CardFooter>
                            </Card>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-[#1A1A1A] rounded-xl border border-[#262626]">
                    <div className="w-16 h-16 bg-[#262626] rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-[#666666]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h3 className="text-xl font-bold mb-2">沒有找到相關物業</h3>
                    <p className="text-[#999999]">請嘗試調整您的搜尋條件或清除過濾器。</p>
                    <Button
                        variant="outline"
                        className="mt-6"
                        onClick={() => {
                            setSearchTerm('');
                            setFilterType('all');
                            setFilterStatus('all');
                        }}
                    >
                        清除搜尋條件
                    </Button>
                </div>
            )}

            {/* Pagination */}
            {filteredProperties.length > 0 && (
                <div className="mt-12 flex justify-center border-t border-[#262626] pt-8">
                    <div className="flex items-center gap-4 bg-[#141414] border border-[#262626] rounded-full px-4 py-2">
                        <Button variant="ghost" size="sm" disabled>&larr;</Button>
                        <div className="flex gap-2">
                            <button className="w-8 h-8 rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-sm font-bold">1</button>
                            {filteredProperties.length > 9 && (
                                <>
                                    <button className="w-8 h-8 rounded-full hover:bg-[#262626] text-[#999999] flex items-center justify-center text-sm transition-colors">2</button>
                                    <button className="w-8 h-8 rounded-full hover:bg-[#262626] text-[#999999] flex items-center justify-center text-sm transition-colors">3</button>
                                    <span className="text-[#666666] flex items-end px-1">...</span>
                                    <button className="w-8 h-8 rounded-full hover:bg-[#262626] text-[#999999] flex items-center justify-center text-sm transition-colors">10</button>
                                </>
                            )}
                        </div>
                        <Button variant="ghost" size="sm">&rarr;</Button>
                    </div>
                </div>
            )}
        </div>
    );
}
