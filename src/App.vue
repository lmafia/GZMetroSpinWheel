<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useMetroStore } from './stores/metro';
import MetroRoulette from './components/MetroRoulette.vue';

const metroStore = useMetroStore();
const isInitialized = ref(false);

onMounted(async () => {
  await metroStore.loadMetroData();
  isInitialized.value = true;
});

const selectMode = (mode: 'single' | 'double') => {
  metroStore.setMode(mode);  
  metroStore.resetSelection();
};

const spin = async () => {
  if (metroStore.isSpinning) return;
  await metroStore.spin();
};

const resetGame = () => {
  metroStore.resetSelection();
  // Reset mode by setting it to undefined to trigger the mode selection screen
  metroStore.$patch({ mode: null });
};

const reset = () => {
  metroStore.resetSelection();
};

const rouletteItems = computed(() => {
  // Return empty array if data isn't loaded yet
  if (!isInitialized.value || !metroStore.metroData || !Array.isArray(metroStore.metroData)) {
    return [];
  }
  
  try {
    if (metroStore.mode === 'single') {
      // For single mode, show all stations with their line colors
      const stations = Array.isArray(metroStore.stationIndex) ? metroStore.stationIndex : [];
      return stations.map((station) => ({
        name: station?.name || '未知站点',
        lines: station?.lines || [{ name: '未知线路', color: '#4CAF50' }]
      }));
    } 
    
    if (metroStore.mode === 'double') {
      if (!metroStore.selectedLine) {
        // For double mode first spin, show all lines
        return metroStore.metroData.map((line) => ({
          name: line?.name || '未知线路',
          lines: [{
            name: line?.name || '未知线路',
            color: line?.color || '#4CAF50'
          }]
        }));
      } else {
        // For double mode second spin, show stations in the selected line
        const stations = Array.isArray(metroStore.selectedLine.stations) 
          ? metroStore.selectedLine.stations 
          : [];
        return stations.map((stationName) => ({
          name: stationName,
          lines: [{
            name: metroStore.selectedLine?.name || '未知线路',
            color: metroStore.selectedLine?.color || '#4CAF50'
          }]
        }));
      }
    }
  } catch (error) {
    console.error('Error generating roulette items:', error);
    return [];
  }
  
  return [];
});

const selectedItem = computed(() => {
  if (metroStore.mode === 'single' && metroStore.selectedStation) {
    return metroStore.selectedStation;
  }
  if (metroStore.mode === 'double' && metroStore.selectedLine) {
    return {
      name: metroStore.selectedLine.name,
      lines: [{
        name: metroStore.selectedLine.name,
        color: metroStore.selectedLine.color
      }]
    };
  }
  return null;
});
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title" @click="resetGame">🚇 广州地铁随机转盘</h1>
    </header>

    <main class="app-content">
      <!-- Loading State -->
      <div v-if="!isInitialized" class="loading-state">
        <div class="spinner"></div>
        <p>加载地铁数据中...</p>
      </div>

      <!-- Mode Selection -->
      <div v-else-if="!metroStore.mode" class="mode-selection">
        <h2>请选择抽取模式</h2>
        <div class="mode-buttons">
          <button @click="selectMode('single')" class="mode-button">
            <span class="button-icon">🎯</span>
            <span>单级模式</span>
            <span class="button-subtext">直接抽站点</span>
          </button>
          <button @click="selectMode('double')" class="mode-button">
            <span class="button-icon">🔄</span>
            <span>两级模式</span>
            <span class="button-subtext">先抽线路 → 再抽站点</span>
          </button>
        </div>
      </div>

      <!-- Roulette Area -->
      <div v-else class="roulette-interface">
        <div class="mode-indicator">
          <span v-if="metroStore.mode === 'single'">
            单级模式
          </span>
          <span v-else>
            {{ metroStore.selectedLine ? `已选择: ${metroStore.selectedLine.name}` : '请选择地铁线路' }}
          </span>
        </div>
        
        <div class="roulette-wrapper">
          <MetroRoulette
            :items="rouletteItems"
            :is-spinning="metroStore.isSpinning"
            :selected-item="selectedItem"
            @spin-complete="metroStore.stopSpinning"
          />
        </div>

        <div class="action-buttons">
          <button 
            @click="spin" 
            :disabled="metroStore.isSpinning" 
            class="spin-button"
            :class="{ spinning: metroStore.isSpinning }"
          >
            <span v-if="metroStore.mode === 'single'">抽取站点</span>
            <span v-else>
              {{ 
                metroStore.selectedLine 
                    ? '抽取站点' 
                    : '抽取线路' 
              }}
            </span>
          </button>
          
          <button 
            @click="reset" 
            class="reset-button"
            :disabled="metroStore.isSpinning"
          >
            重新选择
          </button>
        </div>
        
        <div v-if="metroStore.selectedStation" class="result-display">
          <h3>抽中站点: {{ metroStore.selectedStation.name }}</h3>
          <div v-if="metroStore.selectedStation.lines.length > 0" class="line-tags">
            <span 
              v-for="(line, index) in metroStore.selectedStation.lines" 
              :key="index"
              class="line-tag"
              :style="{ backgroundColor: line.color }"
            >
              {{ line.name }}
            </span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
:root {
  --primary-color: #1976d2;
  --secondary-color: #424242;
  --accent-color: #82b1ff;
  --error-color: #ff5252;
  --info-color: #2196f3;
  --success-color: #4caf50;
  --warning-color: #fb8c00;
}
html {
  height: 100%;
  overflow: hidden;
}

body {
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #f5f5f5;

}

.app {

  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.app-header {
  text-align: center;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  color: var(--primary-color);
  font-size: 1.5rem;
}

.app-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 1rem 0;
  gap: 2rem;
  width: 100%;
  /* margin: 0 auto; */
}

.mode-selection {
  text-align: center;
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 100%;
}

.mode-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.5rem;
}

.mode-button {
  padding: 1.2rem 1.5rem;
  font-size: 1rem;
  color: #333;
  background-color: white;
  border: 2px solid var(--primary-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  
  .button-icon {
    font-size: 1.8rem;
    margin-bottom: 0.5rem;
  }
  
  .button-subtext {
    font-size: 0.8rem;
    color: #666;
    margin-top: 0.3rem;
  }
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
    background-color: var(--primary-color);
    color: white;
    
    .button-subtext {
      color: rgba(255, 255, 255, 0.9);
    }
  }
}

.mode-button:hover {
  background-color: #1565c0;
}

.spinner-container {
  width: 100%;
  text-align: center;
}

.loading-state {
  text-align: center;
  padding: 2rem;
}
.loading-state .spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  margin: 0 auto 1rem;
  animation: spin 1s linear infinite;
}

.loading-state p {
  color: #666;
  font-size: 1.1rem;
}

.roulette-interface {
  text-align: center;
  flex:1;
  display: flex;
  flex-direction:column;
  gap: 1rem;
}

.mode-indicator {
  font-size: 1.2rem;
  font-weight: 500;
  color: var(--primary-color);
  background: #ffffff;
  padding: 0.5rem 1rem;
  border-radius: 16px;
  display: inline-block;
}

.roulette-wrapper {
  position: relative;
  width: auto;
  height: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.spinner.spinning {
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes spin-ccw {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(-360deg); }
}

.spinner-content {
  padding: 1rem;
}

.result h3 {
  font-size: 1.8rem;
  margin-bottom: 1rem;
  color: var(--primary-color);
}

.lines {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.line-tag {
  color: white;
  padding: 0.3rem 0.8rem;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
}

.line {
  font-size: 1.2rem;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  display: inline-block;
}

.prompt {
  font-size: 1.2rem;
  color: #666;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.spin-button,
.reset-button {
  display: flex;
  font-size: 1rem;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  &:hover:not(:disabled) {
    background-color: #f0f0f0;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  &.spinning {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.8);
    border-radius: 50%;
    border-top-color: transparent;
    animation: spin 0.8s linear infinite;
    margin-right: 8px;
    vertical-align: middle;
  }
}


.result-display {
  padding: 1.5rem;
  background: white;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-left: auto;
  margin-right: auto;
  
  h3 {
    color: var(--primary-color);
    margin-bottom: 1rem;
    font-size: 1.3rem;
  }
  
  .line-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
    margin-top: 0.5rem;
  }
  
  .line-tag {
    color: white;
    padding: 0.3rem 0.8rem;
    border-radius: 4px;
    font-size: 0.9rem;
    font-weight: 500;
    white-space: nowrap;
  }
}


</style>
