import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Widget } from './custom-dashboard';

export interface DashboardState {
  dashboards: Dashboard[];
  activeDashboard: string | null;
  templates: DashboardTemplate[];
  isLoading: boolean;
  error: string | null;
  preferences: DashboardPreferences;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  widgets: Widget[];
  layout: any;
  isDefault: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags: string[];
  category: string;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  widgets: Omit<Widget, 'id'>[];
  layout: any;
  thumbnail?: string;
  isBuiltIn: boolean;
  downloadCount: number;
  rating: number;
}

export interface DashboardPreferences {
  autoSave: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  theme: 'light' | 'dark' | 'auto';
  gridSize: number;
  showGridLines: boolean;
  snapToGrid: boolean;
  animateTransitions: boolean;
}

type DashboardAction =
  | { type: 'LOAD_DASHBOARDS_START' }
  | { type: 'LOAD_DASHBOARDS_SUCCESS'; payload: Dashboard[] }
  | { type: 'LOAD_DASHBOARDS_ERROR'; payload: string }
  | { type: 'CREATE_DASHBOARD'; payload: Dashboard }
  | { type: 'UPDATE_DASHBOARD'; payload: Dashboard }
  | { type: 'DELETE_DASHBOARD'; payload: string }
  | { type: 'SET_ACTIVE_DASHBOARD'; payload: string }
  | { type: 'LOAD_TEMPLATES'; payload: DashboardTemplate[] }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<DashboardPreferences> }
  | { type: 'ADD_WIDGET'; payload: { dashboardId: string; widget: Widget } }
  | { type: 'UPDATE_WIDGET'; payload: { dashboardId: string; widget: Widget } }
  | { type: 'DELETE_WIDGET'; payload: { dashboardId: string; widgetId: string } }
  | { type: 'UPDATE_LAYOUT'; payload: { dashboardId: string; layout: any } };

const initialState: DashboardState = {
  dashboards: [],
  activeDashboard: null,
  templates: [],
  isLoading: false,
  error: null,
  preferences: {
    autoSave: true,
    autoRefresh: false,
    refreshInterval: 30000,
    theme: 'auto',
    gridSize: 60,
    showGridLines: true,
    snapToGrid: true,
    animateTransitions: true
  }
};

function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'LOAD_DASHBOARDS_START':
      return {
        ...state,
        isLoading: true,
        error: null
      };

    case 'LOAD_DASHBOARDS_SUCCESS':
      return {
        ...state,
        dashboards: action.payload,
        isLoading: false,
        error: null
      };

    case 'LOAD_DASHBOARDS_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload
      };

    case 'CREATE_DASHBOARD':
      return {
        ...state,
        dashboards: [...state.dashboards, action.payload],
        activeDashboard: action.payload.id
      };

    case 'UPDATE_DASHBOARD':
      return {
        ...state,
        dashboards: state.dashboards.map(dashboard =>
          dashboard.id === action.payload.id ? action.payload : dashboard
        )
      };

    case 'DELETE_DASHBOARD':
      return {
        ...state,
        dashboards: state.dashboards.filter(dashboard => dashboard.id !== action.payload),
        activeDashboard: state.activeDashboard === action.payload ? 
          state.dashboards.find(d => d.id !== action.payload)?.id || null : 
          state.activeDashboard
      };

    case 'SET_ACTIVE_DASHBOARD':
      return {
        ...state,
        activeDashboard: action.payload
      };

    case 'LOAD_TEMPLATES':
      return {
        ...state,
        templates: action.payload
      };

    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload }
      };

    case 'ADD_WIDGET':
      return {
        ...state,
        dashboards: state.dashboards.map(dashboard =>
          dashboard.id === action.payload.dashboardId
            ? {
                ...dashboard,
                widgets: [...dashboard.widgets, action.payload.widget],
                updatedAt: new Date()
              }
            : dashboard
        )
      };

    case 'UPDATE_WIDGET':
      return {
        ...state,
        dashboards: state.dashboards.map(dashboard =>
          dashboard.id === action.payload.dashboardId
            ? {
                ...dashboard,
                widgets: dashboard.widgets.map(widget =>
                  widget.id === action.payload.widget.id ? action.payload.widget : widget
                ),
                updatedAt: new Date()
              }
            : dashboard
        )
      };

    case 'DELETE_WIDGET':
      return {
        ...state,
        dashboards: state.dashboards.map(dashboard =>
          dashboard.id === action.payload.dashboardId
            ? {
                ...dashboard,
                widgets: dashboard.widgets.filter(widget => widget.id !== action.payload.widgetId),
                updatedAt: new Date()
              }
            : dashboard
        )
      };

    case 'UPDATE_LAYOUT':
      return {
        ...state,
        dashboards: state.dashboards.map(dashboard =>
          dashboard.id === action.payload.dashboardId
            ? {
                ...dashboard,
                layout: action.payload.layout,
                updatedAt: new Date()
              }
            : dashboard
        )
      };

    default:
      return state;
  }
}

interface DashboardContextValue {
  state: DashboardState;
  dispatch: React.Dispatch<DashboardAction>;
  actions: {
    loadDashboards: () => Promise<void>;
    createDashboard: (dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Dashboard>;
    updateDashboard: (dashboard: Dashboard) => Promise<void>;
    deleteDashboard: (dashboardId: string) => Promise<void>;
    setActiveDashboard: (dashboardId: string) => void;
    duplicateDashboard: (dashboardId: string) => Promise<Dashboard>;
    loadTemplates: () => Promise<void>;
    createFromTemplate: (templateId: string, name: string) => Promise<Dashboard>;
    exportDashboard: (dashboardId: string) => Promise<string>;
    importDashboard: (data: string) => Promise<Dashboard>;
    updatePreferences: (preferences: Partial<DashboardPreferences>) => void;
    addWidget: (dashboardId: string, widget: Omit<Widget, 'id'>) => void;
    updateWidget: (dashboardId: string, widget: Widget) => void;
    deleteWidget: (dashboardId: string, widgetId: string) => void;
    updateLayout: (dashboardId: string, layout: any) => void;
  };
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

interface DashboardProviderProps {
  children: ReactNode;
}

export function DashboardProvider({ children }: DashboardProviderProps) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  // Generate unique IDs
  const generateId = () => `dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const generateWidgetId = () => `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Load dashboards from storage/API
  const loadDashboards = async () => {
    dispatch({ type: 'LOAD_DASHBOARDS_START' });
    
    try {
      // Load from localStorage for now - replace with API call
      const stored = localStorage.getItem('stacklens-dashboards');
      const dashboards = stored ? JSON.parse(stored).map((d: any) => ({
        ...d,
        createdAt: new Date(d.createdAt),
        updatedAt: new Date(d.updatedAt)
      })) : [];
      
      // Create default dashboard if none exist
      if (dashboards.length === 0) {
        const defaultDashboard: Dashboard = {
          id: generateId(),
          name: 'Default Dashboard',
          description: 'Your main analytics dashboard',
          widgets: [],
          layout: {},
          isDefault: true,
          isPublic: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user',
          tags: ['default'],
          category: 'general'
        };
        dashboards.push(defaultDashboard);
      }
      
      dispatch({ type: 'LOAD_DASHBOARDS_SUCCESS', payload: dashboards });
      
      // Set active dashboard if none set
      if (!state.activeDashboard && dashboards.length > 0) {
        dispatch({ type: 'SET_ACTIVE_DASHBOARD', payload: dashboards[0].id });
      }
    } catch (error) {
      dispatch({ type: 'LOAD_DASHBOARDS_ERROR', payload: 'Failed to load dashboards' });
    }
  };

  // Save dashboards to storage
  const saveDashboards = (dashboards: Dashboard[]) => {
    localStorage.setItem('stacklens-dashboards', JSON.stringify(dashboards));
  };

  // Create new dashboard
  const createDashboard = async (dashboardData: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>): Promise<Dashboard> => {
    const dashboard: Dashboard = {
      ...dashboardData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    dispatch({ type: 'CREATE_DASHBOARD', payload: dashboard });
    return dashboard;
  };

  // Update dashboard
  const updateDashboard = async (dashboard: Dashboard) => {
    const updated = {
      ...dashboard,
      updatedAt: new Date()
    };
    dispatch({ type: 'UPDATE_DASHBOARD', payload: updated });
  };

  // Delete dashboard
  const deleteDashboard = async (dashboardId: string) => {
    dispatch({ type: 'DELETE_DASHBOARD', payload: dashboardId });
  };

  // Set active dashboard
  const setActiveDashboard = (dashboardId: string) => {
    dispatch({ type: 'SET_ACTIVE_DASHBOARD', payload: dashboardId });
  };

  // Duplicate dashboard
  const duplicateDashboard = async (dashboardId: string): Promise<Dashboard> => {
    const original = state.dashboards.find(d => d.id === dashboardId);
    if (!original) throw new Error('Dashboard not found');

    const duplicate: Dashboard = {
      ...original,
      id: generateId(),
      name: `${original.name} (Copy)`,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      widgets: original.widgets.map(widget => ({
        ...widget,
        id: generateWidgetId(),
        layout: {
          ...widget.layout,
          i: generateWidgetId()
        }
      }))
    };

    dispatch({ type: 'CREATE_DASHBOARD', payload: duplicate });
    return duplicate;
  };

  // Load dashboard templates
  const loadTemplates = async () => {
    const builtInTemplates: DashboardTemplate[] = [
      {
        id: 'analytics-overview',
        name: 'Analytics Overview',
        description: 'Complete analytics dashboard with key metrics and charts',
        category: 'analytics',
        isBuiltIn: true,
        downloadCount: 1250,
        rating: 4.8,
        widgets: [
          {
            type: 'metric',
            title: 'Total Users',
            config: { metricKey: 'total_users', format: 'number' },
            layout: { i: '', x: 0, y: 0, w: 3, h: 2 },
            isVisible: true,
            isEditable: true
          },
          {
            type: 'chart',
            title: 'User Growth',
            config: { chartType: 'line', dataSource: 'user_growth' },
            layout: { i: '', x: 3, y: 0, w: 6, h: 4 },
            isVisible: true,
            isEditable: true
          },
          {
            type: 'table',
            title: 'Top Pages',
            config: { columns: [{ key: 'path', label: 'Page' }, { key: 'views', label: 'Views' }] },
            layout: { i: '', x: 9, y: 0, w: 3, h: 4 },
            isVisible: true,
            isEditable: true
          }
        ],
        layout: {}
      },
      {
        id: 'error-monitoring',
        name: 'Error Monitoring',
        description: 'Monitor application errors and performance issues',
        category: 'monitoring',
        isBuiltIn: true,
        downloadCount: 890,
        rating: 4.6,
        widgets: [
          {
            type: 'metric',
            title: 'Error Rate',
            config: { metricKey: 'error_rate', format: 'percentage' },
            layout: { i: '', x: 0, y: 0, w: 3, h: 2 },
            isVisible: true,
            isEditable: true
          },
          {
            type: 'alert',
            title: 'Recent Errors',
            config: { alertTypes: ['error', 'critical'], maxAlerts: 10 },
            layout: { i: '', x: 3, y: 0, w: 6, h: 3 },
            isVisible: true,
            isEditable: true
          }
        ],
        layout: {}
      }
    ];

    dispatch({ type: 'LOAD_TEMPLATES', payload: builtInTemplates });
  };

  // Create dashboard from template
  const createFromTemplate = async (templateId: string, name: string): Promise<Dashboard> => {
    const template = state.templates.find(t => t.id === templateId);
    if (!template) throw new Error('Template not found');

    const dashboard: Dashboard = {
      id: generateId(),
      name,
      description: `Created from ${template.name} template`,
      widgets: template.widgets.map(widget => ({
        ...widget,
        id: generateWidgetId(),
        layout: {
          ...widget.layout,
          i: generateWidgetId()
        }
      })),
      layout: template.layout,
      isDefault: false,
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user',
      tags: ['template', template.category],
      category: template.category
    };

    dispatch({ type: 'CREATE_DASHBOARD', payload: dashboard });
    return dashboard;
  };

  // Export dashboard
  const exportDashboard = async (dashboardId: string): Promise<string> => {
    const dashboard = state.dashboards.find(d => d.id === dashboardId);
    if (!dashboard) throw new Error('Dashboard not found');

    const exportData = {
      version: '1.0',
      type: 'dashboard',
      timestamp: new Date().toISOString(),
      dashboard: {
        ...dashboard,
        id: undefined, // Remove ID for clean import
        createdAt: undefined,
        updatedAt: undefined
      }
    };

    return JSON.stringify(exportData, null, 2);
  };

  // Import dashboard
  const importDashboard = async (data: string): Promise<Dashboard> => {
    try {
      const importData = JSON.parse(data);
      
      if (importData.type !== 'dashboard' || !importData.dashboard) {
        throw new Error('Invalid dashboard format');
      }

      const dashboard: Dashboard = {
        ...importData.dashboard,
        id: generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        widgets: importData.dashboard.widgets.map((widget: any) => ({
          ...widget,
          id: generateWidgetId(),
          layout: {
            ...widget.layout,
            i: generateWidgetId()
          }
        }))
      };

      dispatch({ type: 'CREATE_DASHBOARD', payload: dashboard });
      return dashboard;
    } catch (error) {
      throw new Error('Failed to import dashboard: Invalid format');
    }
  };

  // Update preferences
  const updatePreferences = (preferences: Partial<DashboardPreferences>) => {
    dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
    localStorage.setItem('stacklens-dashboard-preferences', JSON.stringify({
      ...state.preferences,
      ...preferences
    }));
  };

  // Widget management
  const addWidget = (dashboardId: string, widgetData: Omit<Widget, 'id'>) => {
    const widget: Widget = {
      ...widgetData,
      id: generateWidgetId(),
      layout: {
        ...widgetData.layout,
        i: generateWidgetId()
      }
    };

    dispatch({ type: 'ADD_WIDGET', payload: { dashboardId, widget } });
  };

  const updateWidget = (dashboardId: string, widget: Widget) => {
    dispatch({ type: 'UPDATE_WIDGET', payload: { dashboardId, widget } });
  };

  const deleteWidget = (dashboardId: string, widgetId: string) => {
    dispatch({ type: 'DELETE_WIDGET', payload: { dashboardId, widgetId } });
  };

  const updateLayout = (dashboardId: string, layout: any) => {
    dispatch({ type: 'UPDATE_LAYOUT', payload: { dashboardId, layout } });
  };

  // Save to localStorage when dashboards change
  useEffect(() => {
    if (state.dashboards.length > 0) {
      saveDashboards(state.dashboards);
    }
  }, [state.dashboards]);

  // Load preferences on mount
  useEffect(() => {
    const stored = localStorage.getItem('stacklens-dashboard-preferences');
    if (stored) {
      try {
        const preferences = JSON.parse(stored);
        dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
      } catch (error) {
        console.warn('Failed to load dashboard preferences');
      }
    }
  }, []);

  const actions = {
    loadDashboards,
    createDashboard,
    updateDashboard,
    deleteDashboard,
    setActiveDashboard,
    duplicateDashboard,
    loadTemplates,
    createFromTemplate,
    exportDashboard,
    importDashboard,
    updatePreferences,
    addWidget,
    updateWidget,
    deleteWidget,
    updateLayout
  };

  return (
    <DashboardContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </DashboardContext.Provider>
  );
}

export default DashboardProvider;