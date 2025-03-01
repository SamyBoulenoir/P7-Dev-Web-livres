const mongoose = require('mongoose');

const thingSchema = mongoose.Schema({
    userId: { type: String, required: true },
    title: { type: String, required: true },
    author: { type: String, required: true },
    imageUrl: { type: String, required: true },
    year: { type: Number, required: true },
    genre: { type: String, required: true },
    ratings: [
        {
            userId: { type: String, required: true },
            grade: { type: Number, required: true }
        }
    ],
    averageRating: { type: Number, default: 0 }
});

module.exports = mongoose.model('Thing', thingSchema);


thingSchema.methods.calculateAverageRating = function() {
  if (this.ratings.length === 0) return 0;
  const total = this.ratings.reduce((acc, ratings) => acc + ratings.grade, 0);
  return total / this.ratings.length;
};


thingSchema.pre('save', function(next) {
  this.averageRating = this.calculateAverageRating();
  next();
});


module.exports = mongoose.model('Thing', thingSchema);