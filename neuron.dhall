-- Documentation for neuron.dhall: https://neuron.zettel.page/configuration
{ siteTitle = "Mark's Zettlekasten"
, author = Some "Mark Lucernas"
, siteBaseUrl = Some "https://marklucernas.dev/"
-- List of color names: https://semantic-ui.com/usage/theming.html#sitewide-defaults
, theme = "red"
-- This is used in the "edit" button
-- , editUrl = Some "https://github.com/marklcrns/my-zettelkasten/edit/master/"
, plugins = ["links", "tags", "uptree", "feed"]
}
