import { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';

export abstract class BaseRepository<T extends keyof PrismaClient> {
  protected model: any;

  constructor(modelName: T) {
    this.model = (prisma as any)[modelName];
  }

  async findById(id: string, options: any = {}) {
    return this.model.findUnique({
      where: { id },
      ...options
    });
  }

  async findAll(options: any = {}) {
    return this.model.findMany(options);
  }

  async create(data: any, options: any = {}) {
    return this.model.create({
      data,
      ...options
    });
  }

  async update(id: string, data: any, options: any = {}) {
    return this.model.update({
      where: { id },
      data,
      ...options
    });
  }

  async delete(id: string) {
    return this.model.delete({
      where: { id }
    });
  }

  async count(options: any = {}) {
    return this.model.count(options);
  }
}
