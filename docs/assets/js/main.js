import { AppState } from "./core/app-state.js";
import { ViewContext } from "./core/view-context.js";
import { ComponentFactory } from "./ui/component-builder.js";
import { Navigator } from "./ui/navigation.js";
import { SourceRenderers } from "./services/source-renderers.js";
import { RelatedRenderers } from "./services/related-renderers.js";
import { TabRenderers } from "./tabs/tab-renderers.js";
import { TabRendererRegistry } from "./tabs/tab-registry.js";
import { ViewController } from "./view-controller.js";
import { DataLoader } from "./data-loader.js";
import { EventController, renderLoadError } from "./event-controller.js";

const state = AppState.getInstance();
const ctx = new ViewContext(state);

const components = new ComponentFactory();
const navigation = new Navigator(ctx);
const sources = new SourceRenderers(ctx);
const related = new RelatedRenderers(ctx);
const tabs = new TabRenderers(ctx);

ctx.bindServices({ sources, related, navigation, components, tabs });

const tabRegistry = new TabRendererRegistry(tabs);
const viewController = new ViewController(ctx, tabRegistry);
const eventController = new EventController(state, navigation, viewController);

eventController.bind();

new DataLoader(state)
  .load()
  .catch((error) => {
    renderLoadError(error);
  });
