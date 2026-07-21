/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { ServiceToken } from './tokens'

type Factory<T> = () => T

/**
 * Lightweight DI container with lazy singleton pattern.
 * Services are created on first access and cached.
 * Extensions can register their own services.
 */
class ServiceContainerImpl {
  private factories = new Map<ServiceToken, Factory<unknown>>()
  private instances = new Map<ServiceToken, unknown>()

  /**
   * Register a service factory. The factory is called once on first get().
   */
  register<T>(token: ServiceToken, factory: Factory<T>): void {
    if (this.factories.has(token)) {
      console.warn(`[Container] Overwriting existing registration for ${token.description}`)
    }
    this.factories.set(token, factory)
  }

  /**
   * Get a service instance. Creates it lazily on first access.
   */
  get<T>(token: ServiceToken): T {
    // Return cached instance if available
    if (this.instances.has(token)) {
      return this.instances.get(token) as T
    }

    // Create from factory
    const factory = this.factories.get(token)
    if (!factory) {
      throw new Error(`[Container] Service not registered: ${token.description}`)
    }

    const instance = factory() as T
    this.instances.set(token, instance)
    return instance
  }

  /**
   * Check if a service is registered.
   */
  has(token: ServiceToken): boolean {
    return this.factories.has(token)
  }

  /**
   * Reset the container (for testing).
   */
  reset(): void {
    this.factories.clear()
    this.instances.clear()
  }
}

export const Container = new ServiceContainerImpl()
