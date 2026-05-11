#include <Wire.h>

// Non-blocking telemetry firmware for Arduino -> Python dashboard.
// Sends one newline-delimited JSON frame every 50 ms.
// Safe even when MPU6050 is missing/miswired.

const int potPin = A2;
const int ledPin = 8;
const int speakerPin = 12;
const int MPU_ADDR = 0x68;

const unsigned long SAMPLE_PERIOD_MS = 50;
const unsigned long BEEP_ON_MS = 60;
const unsigned long BEEP_OFF_MS = 60;

int16_t ax = 0, ay = 0, az = 0, gx = 0, gy = 0, gz = 0;
unsigned long lastSampleMs = 0;
unsigned long beepTimerMs = 0;
uint32_t seq = 0;

int pendingBeeps = 0;
bool beepIsOn = false;
bool mpuPresent = false;

bool probeMPU6050() {
  Wire.beginTransmission(MPU_ADDR);
  return Wire.endTransmission(true) == 0;
}

bool readMPU6050() {
  if (!mpuPresent) {
    gx = 0;
    gy = 0;
    gz = 0;
    return false;
  }

  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  byte txStatus = Wire.endTransmission(false);
  if (txStatus != 0) {
    mpuPresent = false;
    gx = 0;
    gy = 0;
    gz = 0;
    return false;
  }

  byte bytesRead = Wire.requestFrom(MPU_ADDR, 14, true);
  if (bytesRead != 14) {
    while (Wire.available()) {
      Wire.read();
    }
    gx = 0;
    gy = 0;
    gz = 0;
    return false;
  }

  ax = (int16_t)((Wire.read() << 8) | Wire.read());
  ay = (int16_t)((Wire.read() << 8) | Wire.read());
  az = (int16_t)((Wire.read() << 8) | Wire.read());
  Wire.read();
  Wire.read();
  gx = (int16_t)((Wire.read() << 8) | Wire.read());
  gy = (int16_t)((Wire.read() << 8) | Wire.read());
  gz = (int16_t)((Wire.read() << 8) | Wire.read());
  return true;
}

void wakeMPU6050() {
  if (!mpuPresent) return;

  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);
  Wire.write(0x00);
  byte status = Wire.endTransmission(true);
  if (status != 0) {
    mpuPresent = false;
  }
}

void scheduleBeeps(int count) {
  if (count <= 0) return;
  pendingBeeps = count;
  beepIsOn = false;
  beepTimerMs = 0;
}

void serviceSerialCommands() {
  while (Serial.available() > 0) {
    char c = Serial.read();
    if (c == 'B') {
      scheduleBeeps(2);
    } else if (c == 'C') {
      scheduleBeeps(1);
    }
  }
}

void serviceBeeper() {
  unsigned long now = millis();

  if (pendingBeeps <= 0) {
    if (beepIsOn) {
      noTone(speakerPin);
      digitalWrite(ledPin, LOW);
      beepIsOn = false;
    }
    return;
  }

  if (!beepIsOn) {
    if (beepTimerMs == 0 || now - beepTimerMs >= BEEP_OFF_MS) {
      tone(speakerPin, 440);
      digitalWrite(ledPin, HIGH);
      beepIsOn = true;
      beepTimerMs = now;
    }
  } else {
    if (now - beepTimerMs >= BEEP_ON_MS) {
      noTone(speakerPin);
      digitalWrite(ledPin, LOW);
      beepIsOn = false;
      beepTimerMs = now;
      pendingBeeps--;
    }
  }
}

void sendTelemetryFrame() {
  int steeringRaw = analogRead(potPin);
  int steering = map(steeringRaw, 0, 1023, 135, -135);
  bool mpuOk = readMPU6050();

  char frame[160];
  snprintf(
    frame,
    sizeof(frame),
    "{\"seq\":%lu,\"str\":%d,\"gx\":%d,\"gy\":%d,\"gz\":%d,\"mpu_ok\":%d,\"raw\":%d}",
    (unsigned long)seq++,
    steering,
    gx,
    gy,
    gz,
    mpuOk ? 1 : 0,
    steeringRaw
  );
  Serial.println(frame);
}

void setup() {
  Serial.begin(115200);
  Wire.begin();

  #if defined(WIRE_HAS_TIMEOUT)
    Wire.setWireTimeout(3000, true);  // 3 ms timeout; reset I2C if bus locks.
  #endif

  Wire.setClock(100000L);  // More reliable than 400 kHz on loose jumper wires.

  pinMode(ledPin, OUTPUT);
  pinMode(speakerPin, OUTPUT);
  digitalWrite(ledPin, LOW);

  delay(250);
  mpuPresent = probeMPU6050();
  wakeMPU6050();

  Serial.println("{\"boot\":1,\"firmware\":\"sem_telemetry_noblock\"}");
}

void loop() {
  serviceSerialCommands();
  serviceBeeper();

  unsigned long now = millis();
  if (now - lastSampleMs >= SAMPLE_PERIOD_MS) {
    lastSampleMs = now;
    sendTelemetryFrame();
  }
}
