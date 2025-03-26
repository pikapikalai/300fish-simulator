// 魚群模擬
let fishes = [];
const FISH_COUNT = 300;
const MAX_SPEED = 3;
const MAX_FORCE = 0.05;

// 感知範圍
const SEPARATION_DISTANCE = 25;
const ALIGNMENT_DISTANCE = 50;
const COHESION_DISTANCE = 50;

// 行為權重
const SEPARATION_WEIGHT = 1.5;
const ALIGNMENT_WEIGHT = 1.0;
const COHESION_WEIGHT = 1.0;
const AVOID_WALLS_WEIGHT = 1.5;

// 邊界檢測距離
const MARGIN = 30;

// 滑鼠點擊波浪效果
let waves = [];
// 波浪效果持續時間（秒）
const WAVE_DURATION = 30;
// 波浪吸引力權重
const WAVE_ATTRACTION_WEIGHT = 2.0;
// 波浪最大半徑
const MAX_WAVE_RADIUS = 200;
// 波浪最小半徑
const MIN_WAVE_RADIUS = 10;
// 波浪擴散速度
const WAVE_SPEED = 2;
// 最大波浪數量
const MAX_WAVE_COUNT = 3;
// 波浪圈數量
const WAVE_CIRCLES_COUNT = 5;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  
  // 創建魚群
  for (let i = 0; i < FISH_COUNT; i++) {
    fishes.push(new Fish());
  }
}

function mousePressed() {
  // 如果波浪數量已達最大值，移除最舊的一個
  if (waves.length >= MAX_WAVE_COUNT) {
    waves.shift();
  }
  
  // 創建新的波浪源
  waves.push({
    position: createVector(mouseX, mouseY),
    startTime: millis(),
    circles: initializeWaveCircles(),
    active: true
  });
}

// 初始化波浪圈
function initializeWaveCircles() {
  let circles = [];
  for (let i = 0; i < WAVE_CIRCLES_COUNT; i++) {
    circles.push({
      radius: MIN_WAVE_RADIUS + (i * 15),
      alpha: map(i, 0, WAVE_CIRCLES_COUNT-1, 80, 20),
      hue: 180 + i * 15
    });
  }
  return circles;
}

function draw() {
  background(210, 80, 70); // 藍色背景模擬水
  
  // 更新和繪製波浪
  updateWaves();
  
  // 更新和繪製每條魚
  for (let fish of fishes) {
    fish.flock(fishes);
    // 如果有活躍的波浪，將魚吸引到波浪位置
    for (let wave of waves) {
      if (wave.active) {
        let attraction = fish.attractToWave(wave);
        attraction.mult(WAVE_ATTRACTION_WEIGHT);
        fish.applyForce(attraction);
      }
    }
    fish.update();
    fish.display();
  }
}

// 更新和繪製波浪
function updateWaves() {
  for (let i = waves.length - 1; i >= 0; i--) {
    let wave = waves[i];
    
    // 檢查波浪是否過期
    let elapsedTime = (millis() - wave.startTime) / 1000; // 轉換為秒
    if (elapsedTime > WAVE_DURATION) {
      wave.active = false;
      waves.splice(i, 1);
      continue;
    }
    
    // 更新每個波浪圈
    for (let j = 0; j < wave.circles.length; j++) {
      let circle = wave.circles[j];
      
      // 擴大波浪圈半徑
      circle.radius += WAVE_SPEED;
      
      // 如果波浪圈達到最大半徑，重置到最小半徑
      if (circle.radius > MAX_WAVE_RADIUS) {
        circle.radius = MIN_WAVE_RADIUS;
      }
      
      // 繪製波浪圈
      noFill();
      stroke(circle.hue, 80, 100, circle.alpha);
      strokeWeight(2);
      ellipse(wave.position.x, wave.position.y, circle.radius * 2);
    }
    
    // 繪製中心點
    fill(0, 0, 100, 70);
    noStroke();
    ellipse(wave.position.x, wave.position.y, 8);
  }
}

class Fish {
  constructor() {
    // 魚的初始位置和速度
    this.position = createVector(random(width), random(height));
    this.velocity = p5.Vector.random2D();
    this.velocity.setMag(random(1, 2));
    this.acceleration = createVector(0, 0);
    
    // 使用 HSB 顏色模式設置更鮮豔的顏色
    this.hue = random(360); // 隨機色相
    this.size = random(4, 8);
    this.color = color(
      this.hue,
      random(70, 100), // 飽和度 70-100%
      random(80, 100), // 亮度 80-100%
      80             // 透明度
    );
  }
  
  flock(fishes) {
    // 應用群體行為規則
    let separation = this.separate(fishes);
    let alignment = this.align(fishes);
    let cohesion = this.cohesion(fishes);
    let avoidWalls = this.avoidWalls();
    
    // 套用權重
    separation.mult(SEPARATION_WEIGHT);
    alignment.mult(ALIGNMENT_WEIGHT);
    cohesion.mult(COHESION_WEIGHT);
    avoidWalls.mult(AVOID_WALLS_WEIGHT);
    
    // 套用力量
    this.applyForce(separation);
    this.applyForce(alignment);
    this.applyForce(cohesion);
    this.applyForce(avoidWalls);
  }
  
  // 分離行為 - 避免擁擠
  separate(fishes) {
    let steeringForce = createVector();
    let count = 0;
    
    for (let other of fishes) {
      let distance = p5.Vector.dist(this.position, other.position);
      
      if (other !== this && distance < SEPARATION_DISTANCE) {
        let diff = p5.Vector.sub(this.position, other.position);
        diff.normalize();
        diff.div(distance); // 距離越近，力量越大
        steeringForce.add(diff);
        count++;
      }
    }
    
    if (count > 0) {
      steeringForce.div(count);
    }
    
    if (steeringForce.mag() > 0) {
      steeringForce.normalize();
      steeringForce.mult(MAX_SPEED);
      steeringForce.sub(this.velocity);
      steeringForce.limit(MAX_FORCE);
    }
    
    return steeringForce;
  }
  
  // 對齊行為 - 與鄰近魚對齊方向
  align(fishes) {
    let steeringForce = createVector();
    let count = 0;
    
    for (let other of fishes) {
      let distance = p5.Vector.dist(this.position, other.position);
      
      if (other !== this && distance < ALIGNMENT_DISTANCE) {
        steeringForce.add(other.velocity);
        count++;
      }
    }
    
    if (count > 0) {
      steeringForce.div(count);
      steeringForce.normalize();
      steeringForce.mult(MAX_SPEED);
      steeringForce.sub(this.velocity);
      steeringForce.limit(MAX_FORCE);
    }
    
    return steeringForce;
  }
  
  // 凝聚行為 - 向鄰近魚群中心移動
  cohesion(fishes) {
    let sum = createVector();
    let count = 0;
    
    for (let other of fishes) {
      let distance = p5.Vector.dist(this.position, other.position);
      
      if (other !== this && distance < COHESION_DISTANCE) {
        sum.add(other.position);
        count++;
      }
    }
    
    if (count > 0) {
      sum.div(count);
      return this.seek(sum);
    } else {
      return createVector(0, 0);
    }
  }
  
  // 向目標移動
  seek(target) {
    let desired = p5.Vector.sub(target, this.position);
    desired.normalize();
    desired.mult(MAX_SPEED);
    
    let steer = p5.Vector.sub(desired, this.velocity);
    steer.limit(MAX_FORCE);
    return steer;
  }

  // 被波浪吸引
  attractToWave(wave) {
    let distance = p5.Vector.dist(this.position, wave.position);
    
    // 只有在最大波浪半徑範圍內的魚才會被吸引
    if (distance < MAX_WAVE_RADIUS) {
      // 計算吸引力，距離越近吸引力越強
      let strength = map(distance, 0, MAX_WAVE_RADIUS, 0.1, 0.01);
      let force = p5.Vector.sub(wave.position, this.position);
      force.normalize();
      force.mult(strength);
      return force;
    } else {
      return createVector(0, 0);
    }
  }
  
  // 避開牆壁
  avoidWalls() {
    let desired = null;
    let steeringForce = createVector(0, 0);
    
    // 檢查是否靠近邊界
    if (this.position.x < MARGIN) {
      desired = createVector(MAX_SPEED, this.velocity.y);
    } else if (this.position.x > width - MARGIN) {
      desired = createVector(-MAX_SPEED, this.velocity.y);
    }
    
    if (this.position.y < MARGIN) {
      desired = desired || createVector(this.velocity.x, MAX_SPEED);
      if (desired.y != MAX_SPEED) desired.y = MAX_SPEED;
    } else if (this.position.y > height - MARGIN) {
      desired = desired || createVector(this.velocity.x, -MAX_SPEED);
      if (desired.y != -MAX_SPEED) desired.y = -MAX_SPEED;
    }
    
    if (desired) {
      desired.normalize();
      desired.mult(MAX_SPEED);
      let steer = p5.Vector.sub(desired, this.velocity);
      steer.limit(MAX_FORCE);
      steeringForce = steer;
    }
    
    return steeringForce;
  }
  
  // 應用力量
  applyForce(force) {
    this.acceleration.add(force);
  }
  
  // 更新位置
  update() {
    // 更新速度和位置
    this.velocity.add(this.acceleration);
    this.velocity.limit(MAX_SPEED);
    this.position.add(this.velocity);
    
    // 重設加速度
    this.acceleration.mult(0);
  }
  
  // 繪製魚
  display() {
    let angle = this.velocity.heading() + PI/2;
    push();
    noStroke();
    fill(this.color);
    translate(this.position.x, this.position.y);
    rotate(angle);
    
    // 繪製魚身
    beginShape();
    vertex(0, -this.size*2);
    vertex(-this.size, this.size);
    vertex(0, this.size/2);
    vertex(this.size, this.size);
    endShape(CLOSE);
    
    // 繪製魚尾
    fill(this.hue, 70, 100, 60);
    beginShape();
    vertex(0, this.size/2);
    vertex(-this.size/2, this.size*1.5);
    vertex(0, this.size*1.2);
    vertex(this.size/2, this.size*1.5);
    endShape(CLOSE);
    
    pop();
  }
}

// 當視窗大小改變時調整畫布大小
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
} 