import React, { useEffect, useReducer } from "react";
import * as History from "history";
import { plugins } from "@webiny/plugins";
import { CircularProgress } from "@webiny/ui/Progress";
import { PbPluginsLoader } from "~/types";

const globalState: State = { render: false, editor: false };

// Since these plugins are loaded asynchronously, and some overrides might've been registered
// already by the developer (e.g. in the main App.tsx file), we only register new plugins.
// In other words, if the plugin with a particular name already exists, we skip its registration.

interface State {
    render?: boolean;
    editor?: boolean;
}
interface EditorPluginsLoaderProps {
    location: History.Location;
    children: React.ReactNode;
}
export const EditorPluginsLoader: React.FC<EditorPluginsLoaderProps> = ({ children, location }) => {
    const [loaded, setLoaded] = useReducer(
        (state: State, newState: Partial<State>) => ({ ...state, ...newState }),
        globalState
    );

    async function loadPlugins() {
        const pbPlugins = plugins.byType<PbPluginsLoader>("pb-plugins-loader");
        // load all editor admin plugins
        const loadEditorPlugins = async () =>
            await Promise.all(
                pbPlugins
                    .map(plugin => plugin.loadEditorPlugins && plugin.loadEditorPlugins())
                    .filter(Boolean)
            );
        // load all editor render plugins
        const loadRenderPlugins = async () =>
            await Promise.all(
                pbPlugins
                    .map(plugin => plugin.loadRenderPlugins && plugin.loadRenderPlugins())
                    .filter(Boolean)
            );

        // If we are on pages list route, import plugins required to render the page content.
        if (location.pathname.startsWith("/page-builder/pages") && !loaded.render) {
            const renderPlugins = await loadRenderPlugins();

            // "skipExisting" will ensure existing plugins (with the same name) are not overridden.
            plugins.register(renderPlugins, { skipExisting: true });

            globalState.render = true;
            setLoaded({ render: true });
        }

        // If we are on the Editor route, import plugins required to render both editor and preview.
        if (location.pathname.startsWith("/page-builder/editor") && !loaded.editor) {
            const renderPlugins = !loaded.render ? await loadRenderPlugins() : [];
            const editorAdminPlugins = await loadEditorPlugins();
            // merge both editor admin and render plugins
            const editorRenderPlugins = [...editorAdminPlugins, ...renderPlugins].filter(Boolean);

            // "skipExisting" will ensure existing plugins (with the same name) are not overridden.
            plugins.register(editorRenderPlugins, { skipExisting: true });

            globalState.editor = true;
            globalState.render = true;

            setLoaded({ editor: true, render: true });
        }
    }

    useEffect(() => {
        loadPlugins();
    }, []);

    if (location.pathname.startsWith("/page-builder/pages") && loaded.render) {
        return children as unknown as React.ReactElement;
    }

    if (location.pathname.startsWith("/page-builder/editor") && loaded.editor) {
        return children as unknown as React.ReactElement;
    }

    return <CircularProgress />;
};
