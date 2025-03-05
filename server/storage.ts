import { Message, InsertMessage, TrainingData, InsertTrainingData } from "@shared/schema";

export interface IStorage {
  getMessages(): Promise<Message[]>;
  addMessage(message: InsertMessage): Promise<Message>;
  getTrainingData(): Promise<TrainingData[]>;
  addTrainingData(data: InsertTrainingData): Promise<TrainingData>;
  getMemory(): Promise<Record<string, any>>;
  updateMemory(key: string, value: any): Promise<void>;
}

export class MemStorage implements IStorage {
  private messages: Map<number, Message>;
  private trainingData: Map<number, TrainingData>;
  private memory: Record<string, any>;
  private messageId: number;
  private trainingDataId: number;

  constructor() {
    this.messages = new Map();
    this.trainingData = new Map();
    this.memory = {};
    this.messageId = 1;
    this.trainingDataId = 1;
  }

  async getMessages(): Promise<Message[]> {
    return Array.from(this.messages.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async addMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageId++;
    const message: Message = {
      ...insertMessage,
      id,
      timestamp: new Date(),
      metadata: {}
    };
    this.messages.set(id, message);
    return message;
  }

  async getTrainingData(): Promise<TrainingData[]> {
    return Array.from(this.trainingData.values());
  }

  async addTrainingData(insertData: InsertTrainingData): Promise<TrainingData> {
    const id = this.trainingDataId++;
    const data: TrainingData = {
      ...insertData,
      id,
      timestamp: new Date()
    };
    this.trainingData.set(id, data);
    return data;
  }

  async getMemory(): Promise<Record<string, any>> {
    return { ...this.memory };
  }

  async updateMemory(key: string, value: any): Promise<void> {
    this.memory[key] = value;
  }
}

export const storage = new MemStorage();
