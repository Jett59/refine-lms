db.posts.updateMany({
    'attachments.perUserFileIds': null
}, {
    $unset: { 'attachments.$.perUserLinks': {} }
})
