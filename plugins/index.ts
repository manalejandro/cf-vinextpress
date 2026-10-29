import type { PluginDefinition } from "../press/plugins/types";
import { seoSuite } from "./seo-suite";
import { relatedPosts } from "./related-posts";
import { spamShield } from "./spam-shield";
import { shortcodePack } from "./shortcode-pack";
import { formsmith } from "./formsmith";
import { searchlight } from "./searchlight";
import { waypoint } from "./waypoint";
import { pulse } from "./pulse";
import { bastion } from "./bastion";
import { consentKit } from "./consent-kit";
import { socialShare } from "./social-share";

/**
 * Every plugin bundled with this installation.
 *
 * Adding a plugin is one folder plus one line here:
 *
 *   plugins/
 *     my-plugin/
 *       index.ts   ->  export const myPlugin: PluginDefinition
 *
 * The dashboard discovers plugins from this list; enabling/disabling is
 * stored in the options table and applied on the next request.
 */
export const PLUGINS: PluginDefinition[] = [
  seoSuite,
  relatedPosts,
  spamShield,
  shortcodePack,
  formsmith,
  searchlight,
  waypoint,
  pulse,
  bastion,
  consentKit,
  socialShare,
];
