import { formatJSONResponse } from "@libs/apiGateway";
import { APIGatewayProxyEvent } from "aws-lambda";
import { v4 as uuid } from 'uuid';
import { dynamo } from '@libs/dynamo';

export const handler = async (event: APIGatewayProxyEvent) => {
  try {
    const body = JSON.parse(event.body);
    const tableName = process.env.urlTable;
    const baseUrl = process.env.baseUrl;
    const originalUrl = body.url;

    const code = uuid().slice(0, 3);
    const shortUrl = `${baseUrl}/${code}`;

    const data = {
        id: code,
        shortUrl,
        originalUrl,
    };

    // 既に登録されている場合は再度生成
    let isExist = false;
    const record = await dynamo.get(code, tableName);

    // 既にURLが登録されている場合はそのまま返す
    if (record && record.originalUrl === originalUrl) {
      return formatJSONResponse({ data: {shortUrl: record.shortUrl, originalUrl: record.originalUrl}});
    }

    if (record) {
        isExist = true;
    }

    while(isExist) {
        data.id = uuid().slice(0, 3);

        const record = await dynamo.get(data.id, tableName);
        if (!record) {
            isExist = false;
            break;
        } else {
            isExist = true;
        }
    }

    await dynamo.write(data, tableName);

    return formatJSONResponse({ data: {shortUrl, originalUrl}});
  } catch (error) {
    console.log(error);
    return formatJSONResponse({
      statusCode: 502,
      data: {
        message: error.message,
      },
    });
  }
};
