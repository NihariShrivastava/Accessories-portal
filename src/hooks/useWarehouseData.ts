import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export type Accessory = {
  id: string;
  name: string;
  accessory_code?: string;
  quantity: number;
  price: number;
  vehicle_model: string;
};

export function useWarehouseData(user: User | null) {
  const [inventory, setInventory] = useState<Accessory[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<Accessory[]>([]);
  const [totalModels, setTotalModels] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchInventory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('accessories')
        .select('id, name, accessory_code, quantity, price, vehicle_model')
        .eq('counter_id', user.id);
        
      if (error) throw error;
      setInventory(data || []);
      setFilteredInventory(data || []);
      setTotalModels(new Set((data || []).map(i => i.vehicle_model)).size);
    } catch (error) {
      console.error('Error fetching warehouse inventory:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredInventory(inventory);
      return;
    }
    const lowerQ = query.toLowerCase();
    const filtered = inventory.filter(item => 
      item.name.toLowerCase().includes(lowerQ) || 
      (item.accessory_code && item.accessory_code.toLowerCase().includes(lowerQ)) ||
      item.vehicle_model.toLowerCase().includes(lowerQ)
    );
    setFilteredInventory(filtered);
  }, [inventory]);

  return {
    inventory: filteredInventory,
    totalCount: inventory.length,
    totalModels,
    loading,
    searchQuery,
    handleSearch,
    fetchInventory
  };
}
