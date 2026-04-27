import { BadRequestException } from "@nestjs/common";

export const imageUploadConfig = {
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.match(/\/(jpeg|png)$/)) {
      return callback(
        new BadRequestException('Solo imágenes JPEG o PNG'),
        false,
      );
    }
    callback(null, true);
  },
};
