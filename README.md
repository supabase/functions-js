# `functions-js`

JS Client library to interact with Supabase Functions.

## How to use
------

This library provides an `invoke()` function that can be used with the following syntax:

```ts
const { data: any, error: FunctionsError } = await invoke(functionName: string, input: any, options?:FunctionsInvokeOptions)
```

By default, the invoke function can be used without the `options` parameter and will work automatically for the most common `input` types (e.g. JSON, File, string, etc.)

```js
const { data } = await invoke('function-name', input) 
```

However invoke can also be used with the `options` parameter and in that case provides full-powered low-level access to the underlying Fetch API.


## Sending requests to the edge server
-----

### Sending JSON data

By default, `invoke` will assume that `input` is a plain JSON-parseable object and will send it as a JSON body.
```js
const object = {
  foo: "bar"
}
const { data, error } = await invoke('function-name', object)
```

The `'application/json'` header will automatically be added to the request.

### Sending a File

You can provide a `File` object as input:
```js
const file = new File(...)
const { data, error } = await invoke('function-name', file)
```

The `'application/octet-stream'` header will automatically be added to the request.

### Other supported types

Other supported types are `FormData`, `string`, `Blob` and `ArrayBuffer`.

The headers are automatically associated according to the input type:
| `input` type | Header |
|------------|--------|
| any (default) | 'application/json'|
| string | 'text/plain' |
| FormData | 'mutlipart/form-data' |
| File | 'application/octet-stream' |
| Blob | 'application/octet-stream' |
| ArrayBuffer | 'application/octet-stream' |

If you want to send form content (for instance to transfer multiple file attachements), use the [FormData API](https://developer.mozilla.org/en-US/docs/Web/API/FormData/Using_FormData_Objects) to format your content.

### Full customization with the `requestTransform` option

Under the hood, `invoke()` uses the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). If you need to further customize the headers or body of your request, you can use the `options.requestTransform` callback.

This option gives you the ability to fully transform the underlying [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) options. `requestTransform` is a callback that takes the `input` as argument and <strong>must</strong> return a `RequestInit` object.

```js
const { data, error } = await invoke('function-name', input, { requestTransform: (input) => {
  // Any transform of the input data
  return {
    headers: ...
    body: ...
  }
}})
```
The properties available on the `RequestInit` object are: `headers`, `body`, `mode`, `credentials`, `cache`, `redirect`, `referrer`, and `integrity`. Further information on these options is available [here](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request).

The following property modifications will be ignored :
- `method`: the method is always 'POST'
- `headers` with `'Authorization'`: the `'Authorization'` header always contains the Supabase auth token.


## Receiving responses from the edge server
-----

By default, `invoke()` will return a `{ data, error }` object, where `data` can either be a Blob, a string or a plain JSON object.

### Default `data` return types

The type of `data` is inferred by `invoke()` based on the servers's Response headers:

| Header | `data` type |
|--------|------------------------|
| 'application/json' | any (default) |
| 'text/plain' | string |
| 'application/octet-stream' | Blob |

Examples :
- If your server sends an `'application/json'` response, `data` will be a JSON object:

> ```js
> const { data } = await invoke(...)
> // data is an object whose properties can be extracted :
> const { foo } = data
> ```

- If your server sends an `'application/octet-stream'` response, `data` will be a Blob object:

> ```js
> const { data } = await invoke(...)
> // data is a Blob that can be used to construct a File:
> const file = new File(data)
> ```

### Full customization with the `responseTransform` option

If you need to access the underlying raw [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) object to extract its properties, you can use the `options.responseTransform` callback. 

 `responseTransform` is a callback that takes the `Response` object as argument and <strong>must</strong> return a `Promise`.

 ```js
const { data } = await invoke('function-name', input, { responseTransform: async (response) => {
  // Do anything with the response
  console.log(response.status)
  console.log(response.headers)
  return await response.text()
}})
 ```

 ### `error` object

 Upon error, `invoke()` will return `{ data: null, error }`, where `error` is an `FunctionsError` object which has the following properties :

 | `error instanceof` | Description |
 |--------------------|-------------|
 | `HttpError` | The edge server returned a non-2xx status code |
 | `RelayError` | There was an error communicating with the Deno backend |
 | `FetchError` | The `fetch()` to the edge server call generated an error |
 | `SerializationError` | The `input` data could not be parsed into a suitable `Request` body, or the provided `options.requestTransform` callback is triggering an error |
 | `DeserializationError` | The `Response` object cannot be parsed according to the `headers` value, or the provided `options.responseTransform` callback is triggering an error | 

 ```js
 const { data, error } = await invoke(...)
 if (error) {
  if (error instanceof HttpError) {
    console.log(error.status)
    if (error.status === 403) {
      alert('Forbidden')
    }
    // etc.
  } else if (error instanceof RelayError) {
    console.log(error.context)
  } else {
    // etc.
  }
 }
 ```