declare module '*.css';

declare module 'react-router-dom' {
    import * as React from 'react';

    export const HashRouter: React.FC<any>;
    export const Routes: React.FC<any>;
    export const Route: React.FC<any>;
    export const Navigate: React.FC<any>;

    export function useLocation(): {
        pathname: string;
        search: string;
        hash: string;
        state: any;
        key: string;
    };

    export function useParams<T = any>(): T;
    
    export function useNavigate(): (to: any, options?: any) => void;
}
