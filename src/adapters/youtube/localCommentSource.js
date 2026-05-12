import { normalizeYouTubeComment } from "./commentAdapter.js";

export function createLocalCommentSource(comments = []) {
  let index = 0;

  return {
    next() {
      if (index >= comments.length) return null;
      const raw = comments[index];
      index += 1;
      return normalizeYouTubeComment(
        typeof raw === "string"
          ? {
              display_name: "local_viewer",
              text: raw,
            }
          : raw
      );
    },
  };
}

