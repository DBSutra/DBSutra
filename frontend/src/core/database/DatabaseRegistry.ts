/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
/**
 * Database type descriptor — registered by extensions.
 */
export interface DatabaseTypeDescriptor {
  type: string
  label: string
  icon: string
  defaultPort: number
  defaultHost: string
  defaultUser?: string
  supportsSSH: boolean
  supportsSSL: boolean
  supportsDatabase: boolean
  queryLanguage: string
  defaultConnectionString?: string
  placeholderQuery?: string
}

/**
 * Database Registry — replaces the hardcoded DatabaseType union.
 * Extensions register their database types here.
 */
class DatabaseRegistryImpl {
  private types = new Map<string, DatabaseTypeDescriptor>()

  /**
   * Register a database type.
   */
  register(descriptor: DatabaseTypeDescriptor): void {
    if (this.types.has(descriptor.type)) {
      console.warn(`[DatabaseRegistry] Overwriting existing type: ${descriptor.type}`)
    }
    console.info(`[DatabaseRegistry] Registered: ${descriptor.type} (${descriptor.label})`)
    this.types.set(descriptor.type, descriptor)
  }

  /**
   * Unregister a database type.
   */
  unregister(type: string): void {
    this.types.delete(type)
  }

  /**
   * Get a database type descriptor.
   */
  get(type: string): DatabaseTypeDescriptor | undefined {
    return this.types.get(type)
  }

  /**
   * Get all registered database types.
   */
  getAll(): DatabaseTypeDescriptor[] {
    return Array.from(this.types.values())
  }

  /**
   * Get all registered type strings.
   */
  getTypes(): string[] {
    return Array.from(this.types.keys())
  }

  /**
   * Check if a type is registered.
   */
  has(type: string): boolean {
    return this.types.has(type)
  }

  /**
   * Validate a database type string.
   */
  isValid(type: string): boolean {
    return this.types.has(type)
  }

  /**
   * Get default config for a type.
   */
  getDefaults(type: string): DatabaseTypeDescriptor | undefined {
    return this.types.get(type)
  }
}

export const DatabaseRegistry = new DatabaseRegistryImpl()

// Register built-in database types
DatabaseRegistry.register({
  type: 'mysql',
  label: 'MySQL',
  icon: 'mysql',
  defaultPort: 3306,
  defaultHost: '127.0.0.1',
  defaultUser: 'root',
  supportsSSH: true,
  supportsSSL: true,
  supportsDatabase: true,
  queryLanguage: 'sql',
  placeholderQuery: 'SELECT * FROM table_name LIMIT 100',
})

DatabaseRegistry.register({
  type: 'postgres',
  label: 'PostgreSQL',
  icon: 'postgres',
  defaultPort: 5432,
  defaultHost: '127.0.0.1',
  defaultUser: 'postgres',
  supportsSSH: true,
  supportsSSL: true,
  supportsDatabase: true,
  queryLanguage: 'sql',
  placeholderQuery: 'SELECT * FROM table_name LIMIT 100',
})

DatabaseRegistry.register({
  type: 'sqlite',
  label: 'SQLite',
  icon: 'sqlite',
  defaultPort: 0,
  defaultHost: '',
  supportsSSH: false,
  supportsSSL: false,
  supportsDatabase: true,
  queryLanguage: 'sql',
  placeholderQuery: 'SELECT * FROM table_name LIMIT 100',
})

DatabaseRegistry.register({
  type: 'mongodb',
  label: 'MongoDB',
  icon: 'mongodb',
  defaultPort: 27017,
  defaultHost: '127.0.0.1',
  defaultUser: '',
  supportsSSH: true,
  supportsSSL: true,
  supportsDatabase: true,
  queryLanguage: 'mongodb',
  placeholderQuery: 'db.collection.find({}).limit(100)',
})

DatabaseRegistry.register({
  type: 'redis',
  label: 'Redis',
  icon: 'redis',
  defaultPort: 6379,
  defaultHost: '127.0.0.1',
  supportsSSH: true,
  supportsSSL: true,
  supportsDatabase: false,
  queryLanguage: 'redis',
  placeholderQuery: 'GET key',
})

DatabaseRegistry.register({
  type: 'elasticsearch',
  label: 'Elasticsearch',
  icon: 'elasticsearch',
  defaultPort: 9200,
  defaultHost: '127.0.0.1',
  supportsSSH: false,
  supportsSSL: true,
  supportsDatabase: false,
  queryLanguage: 'json',
  placeholderQuery: '{"query": {"match_all": {}}}',
})
