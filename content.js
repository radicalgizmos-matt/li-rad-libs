/*const sampleSubstitution = {
    probability: 100,
    target: "example",
    caseInsensitive: true,
    wholeWord: true,
    replacements: ["sample1", "sample2"],
};*/

let substitutions = [];
const browserApi = chrome || browser;

//Try to load the substitutions from storage so we aren't starting from scratch each page load
browserApi.storage.local.get(['li_rad_libs_subs'], (result) => {
  substitutions = result.li_rad_libs_subs || [];
  processFeed();
});

//Listen for changes to the substitutions configuration and update accordingly
browserApi.storage.local.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.li_rad_libs_subs) {
    substitutions = changes.li_rad_libs_subs.newValue || [];
    processFeed();
  }
});

/**
 * Processes the feed by applying substitutions to post and comment elements.
 */
const processFeed = () => {
  //Grab the relevant elements in the feed, which include post user titles, post contents, comment user titles, and comment contents
  const postUserTitles = document.querySelectorAll('span.update-components-actor__description > span:first-of-type');
  const posts = document.querySelectorAll('div.feed-shared-update-v2__description > div > span.tvm-parent-container > span');
  const commentUserTitles = document.querySelectorAll('div.comments-comment-meta__description-subtitle');
  const comments = document.querySelectorAll('span.comments-comment-item__main-content > div > span');

  //Process each element to apply substitutions
  postUserTitles.forEach(updateElementContent);
  posts.forEach(updateElementContent);
  commentUserTitles.forEach(updateElementContent);
  comments.forEach(updateElementContent);
}

/**
 * Applies the current substitutions configuration to the text content of a given element.
 * @param {HTMLElement} element the target element
 */
const updateElementContent = (element) => {
  if (!element || !substitutions || substitutions.length === 0) {
    return;
  }

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
  const textNodes = [];
  let currentNode = walker.nextNode();

  //Grab all of the text nodes in the element sub-tree
  while (currentNode) {
    textNodes.push(currentNode);
    currentNode = walker.nextNode();
  }

  textNodes.forEach((textNode) => {
    let textValue = textNode.nodeValue;

    substitutions.forEach((substitution) => {
      if (!substitution || !substitution.target || !Array.isArray(substitution.replacements)) {
        return;
      }

      //Determine if we should apply this substitution based on its probability
      const probability = Number.isFinite(substitution.probability) ? substitution.probability : 100;
      if (Math.random() * 100 > probability) {
        return;
      }

      const target = String(substitution.target);
      const replacements = substitution.replacements.filter((item) => item !== null && item !== undefined);
      if (replacements.length === 0) {
        return;
      }

      //Pick a replacement at random from the list
      const replacement = String(replacements[Math.floor(Math.random() * replacements.length)]);
      const isCaseInsensitive = Boolean(substitution.caseInsensitive);
      const isWholeWord = Boolean(substitution.wholeWord);

      //Escape the target for use in a regex
      const escapedTarget = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      //Consider whole word and case insensitive options
      const pattern = isWholeWord ? `\\b${escapedTarget}\\b` : escapedTarget;
      const flags = `g${isCaseInsensitive ? 'i' : ''}`;

      const regex = new RegExp(pattern, flags);

      //Perform the substitution on any matching text
      if (regex.test(textValue)) {
        textValue = textValue.replace(regex, replacement);
      }
    });

    //Replace the node content only if a substitution was made
    if (textValue !== textNode.nodeValue) {
      textNode.nodeValue = textValue;
    }
  });
}

// Observe changes to the feed and re-process when new content is added
const observer = new MutationObserver(processFeed);
observer.observe(document.body, { childList: true, subtree: true });