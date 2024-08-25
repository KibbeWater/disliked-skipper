import { createId } from '@paralleldrive/cuid2';

export default {
    ce_prefix: createId(),
    identifier: 'com.snow.dislikes-skipper',
    name: 'Dislikes Skipper',
    description: 'Skip songs who have been disliked',
    version: '1.0.2',
    author: 'snow',
    repo: 'https://github.com/kibbewater/disliked-skipper',
    entry: {
        'plugin.js': {
            type: 'main',
        },
    },
};
