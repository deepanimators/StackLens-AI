import { getSearchEngine, AdvancedSearchEngine } from './search-engine';
import { semanticSearchPlugin } from './plugins/semantic-search.plugin';
import { fuzzySearchPlugin } from './plugins/fuzzy-search.plugin';
import { regexSearchPlugin } from './plugins/regex-search.plugin';
import type { SearchEngineConfig, SearchPlugin } from './types';

/**
 * Search Plugin Registry - Manages all available search plugins
 */
class SearchPluginRegistry {
    private plugins: Map<string, SearchPlugin> = new Map();

    constructor() {
        this.registerDefaultPlugins();
    }

    /**
     * Register default search plugins
     */
    private registerDefaultPlugins(): void {
        this.register(semanticSearchPlugin);
        this.register(fuzzySearchPlugin);
        this.register(regexSearchPlugin);

        console.log('🔌 Registered search plugins:', Array.from(this.plugins.keys()));
    }

    /**
     * Register a new search plugin
     */
    register(plugin: SearchPlugin): void {
        this.plugins.set(plugin.name, plugin);
        console.log(`✅ Registered search plugin: ${plugin.name}`);
    }

    /**
     * Unregister a search plugin
     */
    unregister(pluginName: string): void {
        this.plugins.delete(pluginName);
        console.log(`❌ Unregistered search plugin: ${pluginName}`);
    }

    /**
     * Get all registered plugins
     */
    getAll(): SearchPlugin[] {
        return Array.from(this.plugins.values());
    }

    /**
     * Get a specific plugin by name
     */
    get(name: string): SearchPlugin | undefined {
        return this.plugins.get(name);
    }

    /**
     * Get enabled plugins sorted by priority
     */
    getEnabled(): SearchPlugin[] {
        return this.getAll()
            .filter(plugin => plugin.enabled)
            .sort((a, b) => b.priority - a.priority);
    }

    /**
     * Enable/disable a plugin
     */
    setEnabled(pluginName: string, enabled: boolean): void {
        const plugin = this.plugins.get(pluginName);
        if (plugin) {
            plugin.enabled = enabled;
            console.log(`🔄 Plugin ${pluginName} ${enabled ? 'enabled' : 'disabled'}`);
        }
    }

    /**
     * Get plugin configuration
     */
    getPluginConfig(): { [key: string]: { enabled: boolean; priority: number } } {
        const config: { [key: string]: { enabled: boolean; priority: number } } = {};

        this.plugins.forEach(plugin => {
            config[plugin.name] = {
                enabled: plugin.enabled,
                priority: plugin.priority
            };
        });

        return config;
    }

    /**
     * Update plugin configuration
     */
    updatePluginConfig(config: { [key: string]: { enabled?: boolean; priority?: number } }): void {
        Object.entries(config).forEach(([pluginName, pluginConfig]) => {
            const plugin = this.plugins.get(pluginName);
            if (plugin) {
                if (pluginConfig.enabled !== undefined) {
                    plugin.enabled = pluginConfig.enabled;
                }
                if (pluginConfig.priority !== undefined) {
                    plugin.priority = pluginConfig.priority;
                }
            }
        });

        console.log('🔄 Updated plugin configuration:', config);
    }
}

// Global plugin registry instance
export const searchPluginRegistry = new SearchPluginRegistry();

/**
 * Initialize search engine with registered plugins
 */
export function initializeSearchEngine(config?: Partial<SearchEngineConfig>): AdvancedSearchEngine {
    const fullConfig: SearchEngineConfig = {
        enableSemantic: true,
        enableFuzzy: true,
        enableRegex: false, // Disabled by default for safety
        enableCaching: true,
        cacheTimeout: 5 * 60 * 1000, // 5 minutes
        maxResults: 50,
        performanceTracking: true,
        plugins: searchPluginRegistry.getEnabled(),
        ...config
    };

    return getSearchEngine(fullConfig);
}

/**
 * Default search engine instance
 */
export const searchEngine = initializeSearchEngine();

// Re-export everything for convenience
export * from './types';
export { AdvancedSearchEngine } from './search-engine';
export { semanticSearchPlugin } from './plugins/semantic-search.plugin';
export { fuzzySearchPlugin } from './plugins/fuzzy-search.plugin';
export { regexSearchPlugin } from './plugins/regex-search.plugin';