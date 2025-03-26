// ���s����
let fishes = [];
const FISH_COUNT = 300;
const MAX_SPEED = 3;
const MAX_FORCE = 0.05;

// �P���d��
const SEPARATION_DISTANCE = 25;
const ALIGNMENT_DISTANCE = 50;
const COHESION_DISTANCE = 50;

// �欰�v��
const SEPARATION_WEIGHT = 1.5;
const ALIGNMENT_WEIGHT = 1.0;
const COHESION_WEIGHT = 1.0;
const AVOID_WALLS_WEIGHT = 1.5;

// ����˴��Z��
const MARGIN = 30;

// �ƹ��I���i���ĪG
let waves = [];
// �i���ĪG����ɶ��]��^
const WAVE_DURATION = 30;
// �i���l�ޤO�v��
const WAVE_ATTRACTION_WEIGHT = 2.0;
// �i���̤j�b�|
const MAX_WAVE_RADIUS = 200;
// �i���̤p�b�|
const MIN_WAVE_RADIUS = 10;
// �i���X���t��
const WAVE_SPEED = 2;
// �̤j�i���ƶq
const MAX_WAVE_COUNT = 3;
// �i����ƶq
const WAVE_CIRCLES_COUNT = 5;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  
  // �Ыس��s
  for (let i = 0; i < FISH_COUNT; i++) {
    fishes.push(new Fish());
  }
}

function mousePressed() {
  // �p�G�i���ƶq�w�F�̤j�ȡA�������ª��@��
  if (waves.length >= MAX_WAVE_COUNT) {
    waves.shift();
  }
  
  // �Ыطs���i����
  waves.push({
    position: createVector(mouseX, mouseY),
    startTime: millis(),
    circles: initializeWaveCircles(),
    active: true
  });
}

// ��l�ƪi����
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
  background(210, 80, 70); // �Ŧ�I��������
  
  // ��s�Mø�s�i��
  updateWaves();
  
  // ��s�Mø�s�C����
  for (let fish of fishes) {
    fish.flock(fishes);
    // �p�G�����D���i���A�N���l�ި�i����m
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

// ��s�Mø�s�i��
function updateWaves() {
  for (let i = waves.length - 1; i >= 0; i--) {
    let wave = waves[i];
    
    // �ˬd�i���O�_�L��
    let elapsedTime = (millis() - wave.startTime) / 1000; // �ഫ����
    if (elapsedTime > WAVE_DURATION) {
      wave.active = false;
      waves.splice(i, 1);
      continue;
    }
    
    // ��s�C�Ӫi����
    for (let j = 0; j < wave.circles.length; j++) {
      let circle = wave.circles[j];
      
      // �X�j�i����b�|
      circle.radius += WAVE_SPEED;
      
      // �p�G�i����F��̤j�b�|�A���m��̤p�b�|
      if (circle.radius > MAX_WAVE_RADIUS) {
        circle.radius = MIN_WAVE_RADIUS;
      }
      
      // ø�s�i����
      noFill();
      stroke(circle.hue, 80, 100, circle.alpha);
      strokeWeight(2);
      ellipse(wave.position.x, wave.position.y, circle.radius * 2);
    }
    
    // ø�s�����I
    fill(0, 0, 100, 70);
    noStroke();
    ellipse(wave.position.x, wave.position.y, 8);
  }
}

class Fish {
  constructor() {
    // ������l��m�M�t��
    this.position = createVector(random(width), random(height));
    this.velocity = p5.Vector.random2D();
    this.velocity.setMag(random(1, 2));
    this.acceleration = createVector(0, 0);
    
    // �ϥ� HSB �C��Ҧ��]�m���A�v���C��
    this.hue = random(360); // �H�����
    this.size = random(4, 8);
    this.color = color(
      this.hue,
      random(70, 100), // ���M�� 70-100%
      random(80, 100), // �G�� 80-100%
      80             // �z����
    );
  }
  
  flock(fishes) {
    // ���θs��欰�W�h
    let separation = this.separate(fishes);
    let alignment = this.align(fishes);
    let cohesion = this.cohesion(fishes);
    let avoidWalls = this.avoidWalls();
    
    // �M���v��
    separation.mult(SEPARATION_WEIGHT);
    alignment.mult(ALIGNMENT_WEIGHT);
    cohesion.mult(COHESION_WEIGHT);
    avoidWalls.mult(AVOID_WALLS_WEIGHT);
    
    // �M�ΤO�q
    this.applyForce(separation);
    this.applyForce(alignment);
    this.applyForce(cohesion);
    this.applyForce(avoidWalls);
  }
  
  // �����欰 - �קK����
  separate(fishes) {
    let steeringForce = createVector();
    let count = 0;
    
    for (let other of fishes) {
      let distance = p5.Vector.dist(this.position, other.position);
      
      if (other !== this && distance < SEPARATION_DISTANCE) {
        let diff = p5.Vector.sub(this.position, other.position);
        diff.normalize();
        diff.div(distance); // �Z���V��A�O�q�V�j
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
  
  // ����欰 - �P�F�񳽹����V
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
  
  // ���E�欰 - �V�F�񳽸s���߲���
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
  
  // �V�ؼв���
  seek(target) {
    let desired = p5.Vector.sub(target, this.position);
    desired.normalize();
    desired.mult(MAX_SPEED);
    
    let steer = p5.Vector.sub(desired, this.velocity);
    steer.limit(MAX_FORCE);
    return steer;
  }

  // �Q�i���l��
  attractToWave(wave) {
    let distance = p5.Vector.dist(this.position, wave.position);
    
    // �u���b�̤j�i���b�|�d�򤺪����~�|�Q�l��
    if (distance < MAX_WAVE_RADIUS) {
      // �p��l�ޤO�A�Z���V��l�ޤO�V�j
      let strength = map(distance, 0, MAX_WAVE_RADIUS, 0.1, 0.01);
      let force = p5.Vector.sub(wave.position, this.position);
      force.normalize();
      force.mult(strength);
      return force;
    } else {
      return createVector(0, 0);
    }
  }
  
  // �׶}���
  avoidWalls() {
    let desired = null;
    let steeringForce = createVector(0, 0);
    
    // �ˬd�O�_�a�����
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
  
  // ���ΤO�q
  applyForce(force) {
    this.acceleration.add(force);
  }
  
  // ��s��m
  update() {
    // ��s�t�שM��m
    this.velocity.add(this.acceleration);
    this.velocity.limit(MAX_SPEED);
    this.position.add(this.velocity);
    
    // ���]�[�t��
    this.acceleration.mult(0);
  }
  
  // ø�s��
  display() {
    let angle = this.velocity.heading() + PI/2;
    push();
    noStroke();
    fill(this.color);
    translate(this.position.x, this.position.y);
    rotate(angle);
    
    // ø�s����
    beginShape();
    vertex(0, -this.size*2);
    vertex(-this.size, this.size);
    vertex(0, this.size/2);
    vertex(this.size, this.size);
    endShape(CLOSE);
    
    // ø�s����
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

// ������j�p���ܮɽվ�e���j�p
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
} 