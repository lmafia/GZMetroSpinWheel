<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { useMetroStore } from '../stores/metro';
import type { MetroStation } from '../types';

const props = defineProps<{
  items: MetroStation[];
  isSpinning: boolean;
}>();

const emit = defineEmits<{
  (e: 'spin-complete', station: MetroStation): void;
}>();

const metroStore = useMetroStore();
const wheelRef = ref<HTMLElement | null>(null);
const rotation = ref(0);
const isAnimating = ref(false);

// Generate conic gradient for the wheel background
const wheelBackground = computed((): { background: string } => {
  if (!props.items.length) return { background: 'transparent' };
  
  const totalItems = props.items.length;
  
  const gradientStops: string[] = [];
  
  for (let i = 0; i < totalItems; i++) {
    const item = props.items[i];
    if (!item) continue;
    
    const startAngle = (i / totalItems) * 360 ;
    const endAngle = ((i + 1) / totalItems) * 360;
    
    if (item.lines && item.lines.length > 1) {
      // For stations with multiple lines, create a multi-color gradient
      const lineCount = item.lines.length;
      item.lines.forEach((line, idx) => {
        if (!line) return;
        const lineStart = startAngle + (endAngle - startAngle) * (idx / lineCount);
        const lineEnd = startAngle + (endAngle - startAngle) * ((idx + 1) / lineCount);
        gradientStops.push(`${line.color} ${lineStart}deg ${lineEnd}deg`);
      });
    } else {
      // For single-line stations, use the line color or a fallback
      const color = item.lines?.[0]?.color;
      gradientStops.push(`${color} ${startAngle}deg ${endAngle}deg`);
    }
  }
  
  return {
    background: `conic-gradient(${gradientStops.join(', ')}, white 0deg)`
  };
});

// Calculate position for each slice text
const getSliceContainerStyle = (index: number): Record<string, string | number> => {
  if (!props.items.length) return {};
  
  const totalItems = props.items.length;
  const angle = (360 / totalItems) * index + (360 / totalItems / 2);
  const radius = 70; // Distance from center (percentage of radius)
  
  // Convert angle to radians
  const rad = (angle * Math.PI) / 180;
  const x = 50 + radius * Math.cos(rad);
  const y = 50 + radius * Math.sin(rad);
  
  return {
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    transform: `translate(-50%, -50%) rotate(${angle + 90}deg)`,
    transformOrigin: 'left center',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    zIndex: '2',
    pointerEvents: 'none',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
  };
};

// Track current rotation for real-time updates
const currentRotation = ref(0);

// Update current item based on rotation
const updateCurrentItem = () => {
  if (!props.items.length) return;
  
  // Calculate current angle (normalized to 0-360)
  const normalizedRotation = ((currentRotation.value % 360) + 360) % 360;
  const perAngle = 360 / props.items.length;
  
  // Calculate which item is currently selected based on rotation
  const index = Math.floor(normalizedRotation / perAngle);
  const newItem = props.items[(props.items.length - index) % props.items.length];
  
  // Only update if the item has changed
  if (newItem && (!metroStore.selectedStation || newItem.name !== metroStore.selectedStation.name)) {
    metroStore.selectStation(newItem);
  }
};

// Wheel style with rotation
const wheelStyle = computed(() => ({
  transform: `rotate(${rotation.value}deg)`,
  transition: isAnimating.value ? 'none' : 'transform 0.3s ease-out',
  willChange: isAnimating.value ? 'transform' : 'auto',
  width: '100%',
  height: '100%',
  aspectRatio: '1' // Ensure perfect circle
}));

// Watch for rotation changes to update current item
watch(currentRotation, updateCurrentItem);

// Update current item when items change
watch(() => props.items, updateCurrentItem, { immediate: true });

const spinWheel = (): void => {
  if (!props.items.length || isAnimating.value) return;
  
  isAnimating.value = true;
  
  const totalItems = props.items.length;
  const sliceAngle = 360 / totalItems;
  
  // Get the target station and its index
  const targetIndex = Math.floor(Math.random() * totalItems);
  const targetItem = props.items[targetIndex];
  
  // Calculate the current and target angles
  const currentAngle = ((rotation.value % 360) + 360) % 360;
  let targetAngle = 360 - (targetIndex * sliceAngle);
  
  // Add full rotations (3-5 full rotations) and adjust for current position
  const minRotations = 3;
  const maxRotations = 5;
  const fullRotations = minRotations + Math.random() * (maxRotations - minRotations);
  targetAngle += 360 * fullRotations;
  
  // Calculate the total rotation needed
  let angleDiff = targetAngle - currentAngle;
  if (angleDiff < 0) angleDiff += 360;
  
  // Animation variables
  const startTime = performance.now();
  const startRotation = rotation.value;
  const endRotation = startRotation + angleDiff;
  
  // Calculate duration based on total rotation (longer for bigger angles)
  const baseDuration = 1000; // Base duration in ms
  const rotationFactor = angleDiff / 360; // How many full rotations
  const duration = baseDuration * (1 + rotationFactor * 0.5); // Scale duration with rotations
  
  const animate = (timestamp: number) => {
    if (!isAnimating.value) return;
    
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Apply easing function (easeInOutCubic)
    const easedProgress = progress < 0.5
  ? 3 * progress * progress * progress  // More dramatic start
  : 1 - Math.pow(-2 * progress + 2, 4) / 2;  // Smoother end
    
    // Calculate current rotation with easing
    const currentRotationValue = startRotation + (angleDiff * easedProgress);
    rotation.value = currentRotationValue;
    currentRotation.value = currentRotationValue;
    
    // Update current item during spin
    const normalizedRotation = ((currentRotationValue % 360) + 360) % 360;
    const currentIndex = Math.floor(normalizedRotation / sliceAngle) % totalItems;
    const newItem = props.items[(totalItems - currentIndex) % totalItems];
    if (newItem) {
      metroStore.selectStation(newItem);
    }
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // Animation complete
      rotation.value = endRotation;
      currentRotation.value = endRotation;
      isAnimating.value = false;
      if (targetItem) {
        emit('spin-complete', targetItem);
      }
      
    }
  };
  
  requestAnimationFrame(animate);
};

// Watch for isSpinning prop changes
watch(() => props.isSpinning, (newVal) => {
  if (newVal) {
    spinWheel();
  }
});



// Clean up animation frame on unmount
onUnmounted(() => {
  // No need to clean up animation frame as we're using CSS transitions
});
</script>

<template>
  <div class="roulette-container">
    <div class="roulette-wheel" ref="wheelRef" :style="wheelStyle">
      <!-- Background with conic gradient for slices -->
      <div class="wheel-background" :style="wheelBackground"></div>
      
      <!-- Text and indicators -->
      <div 
        v-for="(item, index) in props.items" 
        :key="`slice-${index}`"
        class="slice-container"
        :style="getSliceContainerStyle(index) as Record<string, string | number>"
      >

      </div>
      
      <!-- Center circle -->
      <div class="center-circle">
        <div v-if="metroStore.selectedStation" class="current-selection">
          {{ metroStore.selectedStation.name }}
        </div>
      </div>
    </div>
    
    <!-- Pointer -->
    <div class="roulette-pointer">
  
      <div class="pointer-arrow"></div>

    </div>
  </div>
</template>

<style scoped>
.roulette-container {
  position: relative;
  width: 80vmin;
  height: 80vmin;
  max-width: 500px;
  max-height: 500px;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
}

.roulette-wheel {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease-out;
  transform: rotate(0deg);
  will-change: transform;
  aspect-ratio: 1;
  flex-shrink: 0;
  contain: layout paint;
}

/* Wheel background with conic gradient */
.wheel-background {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  transition: transform 0.3s ease-out;
}

/* Slice container for text */
/* Text containers are positioned absolutely by the getSliceContainerStyle function */

.slice-text {
  position: relative;
  font-size: 12px;
  font-weight: bold;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  padding: 4px 10px;
  background-color: rgba(0, 0, 0, 0.4);
  border-radius: 12px;
  white-space: nowrap;
  pointer-events: none;
  transform-origin: left center;
  text-align: center;
}

/* Center circle */
.center-circle {
  position: absolute;
  width: 80px;
  height: 80px;
  background: white;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.3);
  padding: 10px;
  box-sizing: border-box;
  text-align: center;
}

.current-selection {
  font-size: 12px;
  font-weight: bold;
  color: #333;
  text-align: center;
  padding: 5px;
  word-break: break-word;
  max-width: 100%;
}

/* Pointer */
.roulette-pointer {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 20;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.pointer-arrow {
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 20px solid #ff5252;
  position: relative;
}
/* 
.pointer-arrow::after {
  content: '';
  position: absolute;
  top: -25px;
  left: -5px;
  width: 10px;
  border-right: 10px solid transparent;
  border-top: 20px solid #f44336;
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
} */

.selected-item {
  text-align: center;
  padding: 5px;
}

.selected-name {
  font-size: 10px;
  font-weight: bold;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selected-color {
  width: 20px;
  height: 10px;
  margin: 0 auto;
  border-radius: 2px;
  border: 1px solid #ddd;
}

/* Responsive adjustments */
@media (max-width: 400px) {
  .roulette-container {
    width: 250px;
    height: 250px;
  }
  
  .roulette-center {
    width: 60px;
    height: 60px;
  }
  
  .item-text {
    font-size: 10px;
  }
}
</style>
