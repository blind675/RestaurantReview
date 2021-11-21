'use strict';

const {sanitizeEntity} = require('strapi-utils');

function formatError(error) {
  return [
    {messages: [{id: error.id, message: error.message, field: error.field}]},
  ];
}

async function getUserID(ctx) {
  if (ctx?.request?.header?.authorization) {

    const {id: userID} = await strapi.plugins[
      "users-permissions"
    ].services.jwt.getToken(ctx);

    return userID;
  }

  return undefined;
}

module.exports = {
  async addReview(ctx) {
    const {id} = ctx.params;
    const userID = await getUserID(ctx);
    const {comment, rating, authorName} = ctx.request.body;

    if (!userID) {
      return ctx.badRequest(
        null,
        formatError({
          id: 'User token error',
          message: 'Unauthorized or invalid token!',
        })
      );
    }

    const entity = await strapi.services.restaurant.findOne({id});
    const restaurant = sanitizeEntity(entity, {model: strapi.models.restaurant});

    const creatReview = await strapi.services.review.create({comment, rating, authorName, user: {id: userID}, restaurant: {id}});
    const review = sanitizeEntity(creatReview, {model: strapi.models.review});

    const newAverageRating = restaurant.reviews.reduce((acc, review) => acc + review.rating, 0) / restaurant.reviews.length;
    await strapi.services.restaurant.update({id}, {
      averageRating: newAverageRating,
      minRating: Math.min(restaurant.minRating, rating),
      maxRating: Math.max(restaurant.maxRating, rating),
    });

    return ctx.created(review);
  },
};
