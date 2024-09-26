// SPDX-License-Identifier: MIT

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios, { AxiosInstance } from 'axios';
import { Web3Service } from '@app/web3/web3.service';
import configuration from '@app/shared/configuration';
import { MetaDataDto } from './dtos/metadata.dto';
import { isURL } from 'class-validator';
import * as _ from 'lodash';
import {
  ContractDetailDocument,
  ContractDetails,
  NftDetailDocument,
  NftDetails,
} from '@app/shared/models';
import { getMimeType } from '@app/shared/utils';

const getUrl = (url: string) => {
  if (url.startsWith('ipfs://')) {
    return url?.replace('ipfs://', configuration().IPFS_GATEWAY);
  }

  if (url.startsWith('https://ipfs.io/ipfs/')) {
    return url?.replace('https://ipfs.io/ipfs/', configuration().IPFS_GATEWAY);
  }
  return url;
};

@Injectable()
export class MetadataService {
  constructor(
    @InjectModel(NftDetails.name)
    private readonly nftDetailModel: Model<NftDetailDocument>,
    @InjectModel(ContractDetails.name)
    private readonly contractDetailModel: Model<ContractDetailDocument>,
    private readonly web3Service: Web3Service,
  ) {
    this.client = axios.create({
      timeout: 1000 * 3, // Wait for 5 seconds
    });
  }
  client: AxiosInstance;
  logger = new Logger(MetadataService.name);

  async loadMetadata(id: string) {
    const nftDetail = await this.nftDetailModel
      .findById(id)
      .populate(['chain']);

    const { contractAddress, tokenId, chain } = nftDetail;

    const contractDetail = await this.contractDetailModel.findOne({
      address: contractAddress,
    });
    const tokenURI = await this.web3Service.getNFTUri(
      contractAddress,
      tokenId as string,
      contractDetail.standard,
      chain.rpc,
    );
    if (!tokenURI) return null;

    const httpUrl = getUrl(tokenURI);

    this.logger.debug(
      `tokenUrl of ${contractAddress}:${tokenId} is '${httpUrl}'`,
    );

    let metadata: MetaDataDto;
    if (!isURL(httpUrl)) {
      // try to parse data of encoded base64 file
      const parsedDataBase64 = this.parseJSON(tokenURI);
      if (!parsedDataBase64) {
        this.logger.warn(
          `tokenUrl of ${contractAddress}:${tokenId} is ${tokenURI} - not an validate url, skip`,
        );
        nftDetail.tokenURI = tokenURI;
        await nftDetail.save();
        return;
      }
      metadata = parsedDataBase64;
    } else {
      try {
        metadata = (await this.client.get(httpUrl)).data;
      } catch (error) {
        nftDetail.tokenURI = tokenURI;
        await nftDetail.save();
        throw new Error(error);
      }
    }

    const attributes =
      metadata.attributes
        ?.filter(
          ({ value }) =>
            value !== null &&
            value !== undefined &&
            String(value).trim() !== '',
        )
        .map(({ trait_type, value, display_type }) => ({
          trait_type: trait_type,
          value: value,
          display_type,
        })) || [];
    let animationFileType = undefined;
    try {
      if (metadata.animation_url) {
        const animation_url = getUrl(metadata.animation_url);
        animationFileType = getMimeType(animation_url);
      }
    } catch (error) {
      this.logger.warn(error);
    }

    const newNft = await this.nftDetailModel.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          name: metadata.name,
          image: metadata.image,
          description: metadata.description,
          attributes,
          tokenURI,
          externalUrl: metadata.externalUrl,
          animationUrl: metadata.animation_url,
          animationPlayType: animationFileType,
        },
      },
      { new: true },
    );

    return newNft;
  }

  parseJSON(dataURI: string): any {
    try {
      // Check for Base64 encoding
      const base64Prefix = 'data:application/json;base64,';
      const isBase64 = dataURI.indexOf(base64Prefix) > -1;
      let jsonPart;

      if (isBase64) {
        // Extract and decode the Base64 part
        const base64EncodedJson = dataURI.substring(
          dataURI.indexOf(base64Prefix) + base64Prefix.length,
        );
        const decodedJson = atob(base64EncodedJson); // `atob` is used to decode Base64 content
        jsonPart = decodedJson;
      } else {
        // Simply remove the prefix and decode URI-encoded parts
        jsonPart = dataURI.substring(dataURI.indexOf(',') + 1);
        jsonPart = decodeURIComponent(jsonPart);
      }

      // Parse the JSON string into an object
      return JSON.parse(jsonPart);
    } catch (error) {
      return undefined;
    }
  }
}
