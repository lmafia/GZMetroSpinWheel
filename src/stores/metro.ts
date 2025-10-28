import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { MetroLine, MetroStation, GameMode, GameState } from '../types';

// Helper function to get a random element from an array
const getRandomElement = <T>(array: T[]): T | null => {
  if (!array.length) return null;
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex] ?? null;
};

export const useMetroStore = defineStore('metro', () => {
  // State
  const mode = ref<GameMode | null>(null);
  const selectedLine = ref<MetroLine | null>(null);
  const selectedStation = ref<MetroStation | null>(null);
  const isSpinning = ref(false);
  const isInitialized = ref(false);
  const metroData = ref<MetroLine[]>([]);
  const stationIndex = ref<Array<{name: string; lines: Array<{name: string; color: string}>, id?: string}>>([]);

  // Getters
  const gameState = computed<GameState>(() => ({
    mode: mode.value,
    selectedLine: selectedLine.value,
    selectedStation: selectedStation.value,
    isSpinning: isSpinning.value,
  }));

  // Actions
  const setMode = (newMode: GameMode) => {
    mode.value = newMode;
    resetSelection();
  };

  const selectLine = (line: MetroLine) => {
    selectedLine.value = line;
  };

  const selectStation = (station: MetroStation) => {
    selectedStation.value = station;
    console.log('selectedStation', selectedStation.value);
  };

  const startSpinning = () => {
    isSpinning.value = true;
  };

  const stopSpinning = () => {
    isSpinning.value = false;
  };

  const resetSelection = () => {
    selectedLine.value = null;
    selectedStation.value = null;
  };

  // Load metro data from JSON file
  const loadMetroData = async () => {
    try {
      const response = await fetch('/data/guangzhou_metro_converted.json');
      const lines = await response.json();
      
      if (!Array.isArray(lines)) {
        throw new Error('Invalid metro data format: expected an array of lines');
      }
      
      metroData.value = lines;
      
      // Build station index for quick lookup
      const stationMap = new Map<string, {name: string; id?: string; lines: Array<{name: string; color: string}>}>();
      
      lines.forEach((line: MetroLine) => {
        if (!line.stations || !Array.isArray(line.stations)) {
          console.warn(`Invalid stations data for line ${line.name || 'unknown'}`);
          return;
        }
        
        line.stations.forEach(stationName => {
          if (!stationName) return;
          
          if (!stationMap.has(stationName)) {
            stationMap.set(stationName, {
              name: stationName,
              lines: []
            });
          }
          
          const station = stationMap.get(stationName);
          if (station) {
            station.lines.push({
              name: line.name,
              color: line.color
            });
          }
        });
      });
      
      stationIndex.value = Array.from(stationMap.values());
      isInitialized.value = true;
      
      console.log('Metro data loaded successfully:', {
        lines: metroData.value.length,
        stations: stationIndex.value.length
      });
      
    } catch (error) {
      console.error('Error loading metro data:', error);
      isInitialized.value = false;
      throw error; // Re-throw to allow error handling in components
    }
  };
  
  // Select a random line
  const selectRandomLine = (): MetroLine | null => {
    if (!metroData.value.length) return null;
    return getRandomElement(metroData.value);
  };
  
  // Select a random station from a specific line
  const selectRandomStationFromLine = (line: MetroLine): MetroStation | null => {
    if (!line?.stations?.length) return null;
    const stationName = getRandomElement(line.stations);
    const station = stationIndex.value.find(s => s.name === stationName);
    return station || null;
  };
  
  // Select a random station from all stations
  const selectRandomStation = (): MetroStation | null => {
    if (!stationIndex.value.length) return null;
    return getRandomElement(stationIndex.value);
  };
  
  // Main spin function
  const spin = async () => {
    if (isSpinning.value) return;
    
    isSpinning.value = true;
    
    // Simulate spinning delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (mode.value === 'single') {
      // Single mode: select a random station
      const station = selectRandomStation();
      if (station) {
        selectedStation.value = station;
        selectedLine.value = null;
      }
    } else {
      // Double mode: first select line, then station
      if (!selectedLine.value) {
        // First spin: select line
        selectedLine.value = selectRandomLine();
      } else {
        // Second spin: select station from the selected line
        const station = selectRandomStationFromLine(selectedLine.value);
        if (station) {
          selectedStation.value = station;
        }
      }
    }
    
    isSpinning.value = false;
  };

  return {
    // State
    mode,
    selectedLine,
    selectedStation,
    isSpinning,
    isInitialized,
    metroData,
    stationIndex,
    
    // Getters
    gameState,
    
    // Actions
    setMode,
    selectLine,
    selectStation,
    startSpinning,
    stopSpinning,
    resetSelection,
    loadMetroData,
    spin,
    selectRandomLine,
    selectRandomStationFromLine,
    selectRandomStation,
  };
});
